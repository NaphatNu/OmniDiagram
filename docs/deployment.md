# Deployment topology

Concrete reference for the homeserver docker-compose stack. Rationale lives in [ADR-0002](./adr/0002-postgresql-over-sqlite.md) (Postgres), [ADR-0007](./adr/0007-caddy-reverse-proxy-path-routing.md) (Caddy/routing), and [ADR-0010](./adr/0010-cloudflare-access-guards-dashboard-only.md) (public exposure) — this file is the "what," not the "why."

Target host: `kla-server`. Public URL: `https://omnidiagram.tonkla.studio`.

## Services

| Service    | Image/build          | Host port | Notes |
|------------|-----------------------|-----------|-------|
| `caddy`    | Caddy                | `8090:80` | The only service published to the host; the Cloudflare Tunnel points here |
| `frontend` | `ghcr.io/naphatnu/omnidiagram-frontend` | none | Also hosts the DBML↔SQL conversion routes ([ADR-0009](./adr/0009-dbml-sql-conversion-lives-in-nextjs.md)) |
| `backend`  | `ghcr.io/naphatnu/omnidiagram-backend`  | none | REST API + MCP endpoint |
| `postgres` | `postgres:17-alpine` | none | Data dir bind-mounted to `./data/postgres` |

Port 8090 is used because ports 80, 3000, and 8080 are already taken on `kla-server` by other stacks.

Images are built and pushed to GHCR by CI; the homeserver only pulls. Deploys run `docker compose pull && docker compose up -d`.

## Cloudflare Tunnel

The tunnel already exists as a separate compose project at `/home/tonkla/cloudflare-tunnel`, running `cloudflare/cloudflared` with `network_mode: host` and a token — its ingress is configured in the Cloudflare Zero Trust dashboard, not in a local file. Because it shares the host network it reaches Caddy directly at `localhost:8090`.

Public Hostname entry:

| Field | Value |
|---|---|
| Subdomain | `omnidiagram` |
| Domain | `tonkla.studio` |
| Type | `HTTP` |
| URL | `localhost:8090` |

## Routing (Caddyfile)

Single hostname, path-based:

- `/api/*` → `backend` (includes `/api/admin/*`)
- `/mcp/*` → `backend`
- everything else → `frontend`

`/api/internal/*` is served by the frontend for backend-internal conversion calls and **must never be routed through Caddy** — it has no authentication and is reachable only over the compose network.

## Access control

Cloudflare Access's Path field has no "exact match, root only" mode — an empty Path covers the *whole* hostname including every subpath (see [docs/incidents.md](./incidents.md#2026-08-17--cloudflare-access-exact-match-on--is-not-a-real-path-field-mode-21)). The Dashboard lives at `/dashboard`, not `/`, specifically so its Access app can use a real prefix match instead of a catch-all:

| Application | Path | Policy |
|---|---|---|
| OmniDiagram Dashboard | `dashboard/*` | Allow → `tonklanapat@gmail.com` |
| OmniDiagram Admin API | `api/admin/*` | Allow → `tonklanapat@gmail.com` |

Anything without its own Access app (`/`, `/share/*`, `/api/diagrams/*`, `/mcp/*`, `/_next/*`) is public by default — no Bypass apps needed. Verify with a logged-out browser: `/dashboard` must prompt for login, `/share/{token}` must load with no login prompt (and `/` should 307-redirect straight to `/dashboard`, which is what then prompts).

## Persistence

- Postgres data: bind mount, `./data/postgres` → `/var/lib/postgresql/data`. Backup = stop the container and copy/dump the mounted directory.
- No other service holds persistent state; Diagrams and Revisions live only in Postgres.

## Secrets

Single `.env` file at the compose root, gitignored. An `.env.example` template lists the required keys without values:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
MCP_API_KEY=
```

`MCP_API_KEY` is internet-facing (see ADR-0010) — treat it as a real secret, not a LAN formality.

## CI/CD

- Pull requests run on GitHub-hosted runners: lint, typecheck, Vitest, Playwright, and `mvn verify` (Testcontainers).
- Pushes to `main` build images and push them to GHCR (`release.yml`), then `deploy.yml` runs on a self-hosted runner on `kla-server`.
- `deploy.yml` triggers on `workflow_run` after `release.yml` completes on `main` (not on `push` directly) so the deploy never races a build still pushing images. It never triggers on `pull_request` — a fork PR must never execute on the self-hosted runner.
- `deploy.sh` (repo root) does the actual work: `docker compose pull`, `docker compose up -d`, poll the backend's `/actuator/health` (inside the compose network, via `docker compose exec`) for up to 60s, fail loudly if it never comes up, then `docker image prune -f`. It can also be run by hand from the compose root.

### Self-hosted runner setup (manual, once)

Public repos must not run untrusted code on a self-hosted runner, so the whole design routes around that: `deploy.yml` only ever fires via `workflow_run` off `release.yml`, which itself only runs on `push` to `main`, and `main` requires review. Also enable **require approval for workflow runs from outside collaborators** in repo Settings → Actions.

1. Settings → Actions → Runners → add a runner, install it on `kla-server` as a service running under a **dedicated, non-root user** with Docker access, in a work directory outside the other stacks' directories (`sdvd-*`, `retirement-planner-app`, `cloudflare-tunnel`).
2. Before the first deploy, create the `.env` file in that runner's checkout directory (it becomes the compose root — see [Secrets](#secrets)). It's gitignored and never comes from CI.
3. `docker login ghcr.io` isn't needed on the host itself — `deploy.yml` logs in with `GITHUB_TOKEN` before calling `deploy.sh`.
4. The `actions/checkout` step in `deploy.yml` runs with `clean: false`: the checkout directory is reused as the compose root across runs, and the default `git clean -ffdx` would otherwise delete the untracked `.env` and the `./data/postgres` bind mount (the live database) on every deploy.
