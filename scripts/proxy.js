#!/usr/bin/env node

const https = require('https');
const httpProxy = require('http-proxy');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const defaultMappings = ['primary.local:6660', 'api.primary.local:6661', 'satellite.local:6662'];
const mappings = (args.length ? args : defaultMappings).map((str) => {
  const [host, port] = str.split(':');
  return { host, port: Number(port) };
});

const certDir = path.join(process.cwd(), 'certs');
const proxy = httpProxy.createProxyServer({});

const sniContexts = {};
mappings.forEach((m) => {
  const key = fs.readFileSync(path.join(certDir, `${m.host}.key`));
  const cert = fs.readFileSync(path.join(certDir, `${m.host}.crt`));
  sniContexts[m.host] = tls.createSecureContext({ key, cert });
});

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(certDir, `${mappings[0].host}.key`)),
    cert: fs.readFileSync(path.join(certDir, `${mappings[0].host}.crt`)),
    SNICallback: (servername, cb) => {
      const ctx = sniContexts[servername];
      if (ctx) {
        cb(null, ctx);
      } else {
        cb(new Error('No certificate available for ' + servername));
      }
    },
  },
  (req, res) => {
    const host = req.headers.host && req.headers.host.split(':')[0];
    const route = mappings.find((m) => m.host === host);
    if (!route) {
      res.writeHead(502);
      res.end('No route for host');
      return;
    }
    proxy.web(req, res, { target: `http://127.0.0.1:${route.port}` });
  }
);

server.on('connect', (req, socket) => {
  socket.end();
});

server.listen(443, () => {
  console.log('HTTPS proxy running:');
  mappings.forEach((m) => {
    console.log(`  https://${m.host} -> http://localhost:${m.port}`);
  });
});
