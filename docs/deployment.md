# Deployment topology

Concrete reference for the homeserver docker-compose stack. Rationale lives in [ADR-0002](./adr/0002-postgresql-over-sqlite.md) (Postgres), [ADR-0007](./adr/0007-caddy-reverse-proxy-path-routing.md) (Caddy/routing), and [ADR-0010](./adr/0010-cloudflare-access-guards-dashboard-only.md) (public exposure, amended — Cloudflare Access was replaced by Caddy Basic Auth) — this file is the "what," not the "why."

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

The tunnel already exists as a separate compose project at `/home/tonkla/cloudflare-tunnel`, running `cloudflare/cloudflared` with `network_mode: host` and a token — its ingress is configured in the Cloudflare Zero Trust dashboard, not in a local file. Because it shares the host network it reaches Caddy directly at `localhost:8090`. It only provides public reachability/TLS now — no Cloudflare Access application sits in front of it (see [Access control](#access-control)).

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

Cloudflare Access previously guarded `/dashboard` and `/api/admin/*` as separate per-path "applications." That broke the app outright: each Access application issues a session scoped to its own `aud`, so a login completed for `/dashboard` (a full top-level page navigation) never authorized `/api/admin/*` — and since the frontend only ever reaches `/api/admin/*` via background `fetch()` (same-origin credentials, so the cross-origin redirect to Cloudflare's login can't carry an existing session), that app's login could never actually be completed through normal use. Dashboard loaded, but "Failed to load diagrams" and New Diagram silently did nothing, for every browser, 100% of the time. See [docs/incidents.md](./incidents.md#2026-08-18--dashboard-can-never-load-diagrams-or-create-one-dashboard-and-apiadmin-are-different-cloudflare-access-applications-with-different-auds-so-logging-into-one-doesnt-authorize-the-other-21) and [ADR-0010](./adr/0010-cloudflare-access-guards-dashboard-only.md)'s amendment.

Access control now lives entirely in Caddy: a `basic_auth` block wraps `/dashboard`, `/dashboard/*`, and `/api/admin/*`. Basic Auth credentials are sent by the browser on every same-origin request (page loads and `fetch()` alike) once entered, so there's no session/cookie/redirect machinery to get wrong — the class of bug above can't recur here. Everything else (`/`, `/share/*`, `/api/diagrams/*`, `/mcp/*`, `/_next/*`) stays public, unchanged. Verify with a logged-out client: `curl -I` against `/dashboard` and `/api/admin/diagrams` must return `401`; `/share/{token}` and `/api/diagrams/{token}` must return their normal (non-401) status with no credentials.

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
ADMIN_BASIC_AUTH_USER=
ADMIN_BASIC_AUTH_HASH=
```

`MCP_API_KEY` and `ADMIN_BASIC_AUTH_USER`/`ADMIN_BASIC_AUTH_HASH` are internet-facing (see ADR-0010) — treat them as real secrets, not a LAN formality. Generate the Basic Auth hash with `docker run --rm caddy:2-alpine caddy hash-password --plaintext '<password>'`; only the bcrypt hash goes in `.env`, never the plaintext password.

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
