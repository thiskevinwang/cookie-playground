This is a monorepo that is designed for running a few apps locally.

Use the provided scripts to generate and clean up local HTTPS domains and certificates that map to the apps in this monorepo.

## Setup

1. Generate certificates and `/etc/hosts` entries (defaults: `primary.local`, `api.primary.local`, `satellite.local`):

```sh
npm run certs:setup
```

   Custom domains can be supplied as `domain:port` pairs:

```sh
npm run certs:setup -- example.test:7000 api.example.test:7001 static.example.test:7002
```

2. Start the HTTPS proxy (requires port 443):

```sh
sudo npm run proxy
```

3. In a separate terminal, start the apps:

```sh
npm run dev
```

Visit your configured domains in a browser over HTTPS.

## Cleanup

Remove the generated certificates and host entries:

```sh
npm run certs:cleanup
```
