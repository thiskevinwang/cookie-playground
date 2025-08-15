#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const action = process.argv[2];
const args = process.argv.slice(3);
const defaultDomains = ['primary.local:6660', 'api.primary.local:6661', 'satellite.local:6662'];
const mappings = (args.length ? args : defaultDomains).map((str) => {
  const [host, port] = str.split(':');
  return { host, port: Number(port) };
});
const domains = mappings.map((m) => m.host);

const certDir = path.join(process.cwd(), 'certs');
const hostFile = '/etc/hosts';
const rootKey = path.join(certDir, 'localCA.key');
const rootCert = path.join(certDir, 'localCA.pem');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

if (!['setup', 'cleanup'].includes(action)) {
  console.log('Usage: node scripts/certs.js <setup|cleanup> [domain:port ...]');
  process.exit(1);
}

if (action === 'setup') {
  ensureDir(certDir);
  if (!fs.existsSync(rootKey) || !fs.existsSync(rootCert)) {
    run(`openssl genrsa -out ${rootKey} 2048`);
    run(
      `openssl req -x509 -new -nodes -key ${rootKey} -sha256 -days 825 -out ${rootCert} -subj "/CN=LocalDevCA"`
    );
    try {
      if (process.platform === 'linux') {
        run(`sudo cp ${rootCert} /usr/local/share/ca-certificates/localdev-ca.crt`);
        run('sudo update-ca-certificates');
      } else if (process.platform === 'darwin') {
        run(
          `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${rootCert}`
        );
      }
    } catch (err) {
      console.error('Warning: failed to trust root certificate:', err.message);
    }
  }

  domains.forEach((domain) => {
    const key = path.join(certDir, `${domain}.key`);
    const csr = path.join(certDir, `${domain}.csr`);
    const cert = path.join(certDir, `${domain}.crt`);
    const ext = path.join(certDir, `${domain}.ext`);

    run(`openssl genrsa -out ${key} 2048`);
    run(`openssl req -new -key ${key} -out ${csr} -subj "/CN=${domain}"`);
    fs.writeFileSync(ext, `subjectAltName=DNS:${domain}${os.EOL}`);
    run(
      `openssl x509 -req -in ${csr} -CA ${rootCert} -CAkey ${rootKey} -CAcreateserial -out ${cert} -days 825 -sha256 -extfile ${ext}`
    );
    fs.unlinkSync(csr);
    fs.unlinkSync(ext);

    const hosts = fs.readFileSync(hostFile, 'utf8');
    if (!hosts.includes(domain)) {
      run(`echo "127.0.0.1 ${domain}" | sudo tee -a ${hostFile}`);
    }
  });

  console.log('Certificates generated in certs/.');
  console.log('Remember to run `npm run proxy` to start the HTTPS router.');
}

if (action === 'cleanup') {
  domains.forEach((domain) => {
    try {
      fs.unlinkSync(path.join(certDir, `${domain}.key`));
    } catch {}
    try {
      fs.unlinkSync(path.join(certDir, `${domain}.crt`));
    } catch {}
  });
  ['localCA.srl', 'localCA.key', 'localCA.pem'].forEach((f) => {
    try {
      fs.unlinkSync(path.join(certDir, f));
    } catch {}
  });
  try {
    fs.rmdirSync(certDir);
  } catch {}

  let hostsContent = fs.readFileSync(hostFile, 'utf8');
  domains.forEach((domain) => {
    const regex = new RegExp(`^.*\\b${domain}\\b.*$`, 'gm');
    hostsContent = hostsContent.replace(regex, '');
  });
  fs.writeFileSync(hostFile, hostsContent.trim() + os.EOL);

  try {
    if (process.platform === 'linux') {
      run('sudo rm -f /usr/local/share/ca-certificates/localdev-ca.crt');
      run('sudo update-ca-certificates');
    } else if (process.platform === 'darwin') {
      run(
        'sudo security delete-certificate -c LocalDevCA /Library/Keychains/System.keychain'
      );
    }
  } catch (err) {
    console.error('Warning: failed to remove trusted root certificate:', err.message);
  }

  console.log('Certificates and hosts entries cleaned up.');
}
