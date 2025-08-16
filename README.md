This is a monorepo that is designed for running a few apps locally.

Use the provided scripts to generate and clean up local HTTPS domains and certificates that map to the apps in this monorepo.

## Setup

1. Generate certificates and `/etc/hosts` entries (defaults: `primary.local`, `api.primary.local`, `satellite.local`):

```sh
bun run certs:setup
```

   Custom domains can be supplied as `domain:port` pairs:

```sh
bun run certs:setup -- example.test:7000 api.example.test:7001 static.example.test:7002
```

2. Start the apps (in separate terminals):

```sh
bun run dev
```

3. Launch Nginx (Docker) to terminate TLS and proxy to the apps:

```sh
bun run nginx:up
```

Visit your configured domains in a browser over HTTPS:
- https://primary.local
- https://api.primary.local
- https://satellite.local

To inspect or reload Nginx:

```sh
bun run nginx:logs
docker compose exec nginx nginx -s reload
```

## Cleanup

Remove the generated certificates and host entries:

```sh
bun run certs:cleanup
```

---

### Learnings

```console
user@~: $ curl -w "@-" -o /dev/null -s http://localhost:6660 <<<$'connect:%{time_connect} start:%{time_starttransfer} total:%{time_total}\n'

start:%{time_starttransfer} total:%{time_total}\n'
connect:0.000261 start:0.000715 total:0.000773

user@~: $ curl -w "@-" -o /dev/null -s https://primary.local <<<$'ssl:%{time_appconnect} start:%{time_starttransfer} total:%{time_total}\n'

start:%{time_starttransfer} total:%{time_total}\n'
ssl:0.000000 start:0.000000 total:5.021145
```