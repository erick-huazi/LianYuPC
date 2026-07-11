# Amiweave Production Deployment

This stack is designed to run beside unrelated projects on one host.

- Compose project: `amiweave`
- Install directory: `/opt/amiweave`
- Only host binding: `127.0.0.1:${AMIWEAVE_ORIGIN_PORT:-18080}`
- MySQL, Redis, RabbitMQ, and MinIO stay on the private Compose network.
- Volumes and service names are scoped by the Compose project.
- Milvus is disabled for the first production deployment.

## Deploy

Place the repository at `/opt/amiweave`, create `/opt/amiweave/.env`, then run:

```sh
cd /opt/amiweave
sh deploy/amiweave/deploy.sh
curl --fail http://127.0.0.1:18080/healthz
curl --fail http://127.0.0.1:18080/api/auth/captcha
```

Set these deployment-only values in `.env` when the defaults are not suitable:

```dotenv
AMIWEAVE_ORIGIN_PORT=18080
AMIWEAVE_PUBLIC_ORIGINS=https://amiweave.com,https://www.amiweave.com
APP_REVISION=production
```

When a prebuilt backend image has already been loaded on the server, deploy
without a Maven build:

```sh
AMIWEAVE_SKIP_BUILD=1 sh deploy/amiweave/deploy.sh
```

Routine deployments build and replace only the backend, wait for it to become
healthy, and then reconcile the gateway. Existing MySQL, Redis, RabbitMQ, and
MinIO containers are not recreated. To intentionally apply infrastructure
configuration changes, run:

```sh
AMIWEAVE_REFRESH_INFRA=1 sh deploy/amiweave/deploy.sh
```

Changing `APP_REVISION` does not enter the stateful service environments, so a
normal application release cannot invalidate their Compose configuration hash.

The service limits are sized for a 4 GB host. A 2 GB swap file is recommended
as an out-of-memory safety margin; it is not a substitute for monitoring.

Route `amiweave.com` to the loopback origin with the host's existing reverse proxy
or a dedicated Cloudflare Tunnel. Do not bind this stack directly to public
`80`, `443`, or ports already owned by another project.

## Rollback

Check out the previous Git revision and rerun `deploy.sh`. The named Compose
volumes are retained. Do not run `docker compose down -v` in production.
