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

Two Cloudflare Access applications, both allowing `tonklanapat@gmail.com`:

| Application | Path |
|---|---|
| OmniDiagram Dashboard | `omnidiagram.tonkla.studio/` (exact match) |
| OmniDiagram Admin API | `omnidiagram.tonkla.studio/api/admin/*` |

Everything else stays public: `/d/*`, `/api/diagrams/*`, `/mcp/*`, `/_next/*`. The Dashboard policy must match `/` exactly — a bare-hostname policy would also cover `/d/*` and break every share link.

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
- Pushes to `main` build images, push them to GHCR, then deploy via a self-hosted runner on `kla-server`.
- The deploy workflow triggers **only** on `push` to `main`, never on `pull_request` — a fork PR must never execute on the self-hosted runner.
