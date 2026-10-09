# INTLY frontend deployment runbook

The frontend deploys independently from the backend. The production build talks
to `https://api.intly.tech/api/v1`; MSW stays disabled in production.

## CI/CD

Pushes to `main` and manual `workflow_dispatch` runs with `deploy=true` execute
the same gates:

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm build`
- `node scripts/verify-frontend-delivery-contract.mjs`
- `docker compose --env-file .env.production.example -f compose.yaml config --quiet`
- immutable image build and publish as `ghcr.io/<owner>/<repo>:sha-<40-hex-commit>`

The production job runs on GitHub-hosted Ubuntu. It sends a tracked-source
`git archive` and a short-lived GitHub token over SSH to the restricted server
command `deploy <40-hex-commit>`. It requires:

- secret `DEPLOY_SSH_KEY`
- variables `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PORT`, `DEPLOY_KNOWN_HOSTS`

The server key is forced to `/opt/intly/bin/github-deploy frontend`, so the
workflow cannot execute arbitrary shell commands.

## Host contract

- Runtime env stays outside the checkout at `/opt/intly/secrets/frontend.env`.
- The server deploy script writes a release under `/opt/intly/releases/frontend/<sha>-<unique-suffix>`.
- `/opt/intly/current/frontend` points at the last healthy release.
- Compose binds `127.0.0.1:3000:3000`; Nginx owns public ingress.
- The server deploy uses `docker compose up -d --no-build --pull never --wait`
  and checks `http://127.0.0.1:3000/login`.

## Local manual deploy

```bash
INTLY_FRONTEND_ENV_FILE=/opt/intly/secrets/frontend.env \
IMAGE_REF=ghcr.io/somemedic/intly-frontend:sha-0123456789abcdef0123456789abcdef01234567 \
./ops/deploy-frontend.sh
```

Do not use `latest` or branch tags for production.
