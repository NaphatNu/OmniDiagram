# Deployment topology

Concrete reference for the homeserver docker-compose stack. Rationale for the choices here lives in [ADR-0002](./adr/0002-postgresql-over-sqlite.md) (Postgres) and [ADR-0007](./adr/0007-caddy-reverse-proxy-path-routing.md) (Caddy/routing) — this file is the "what," not the "why."

## Services

| Service    | Image/build          | Exposed to host | Notes |
|------------|-----------------------|------------------|-------|
| `caddy`    | Caddy                | Yes — this is what Cloudflare Tunnel points to | Only service reachable from outside the docker network |
| `frontend` | Next.js (build)      | No — internal only | Reached via Caddy |
| `backend`  | Spring Boot (build)  | No — internal only | Serves REST API + MCP endpoint; reached via Caddy |
| `postgres` | `postgres` official  | No — internal only, no host port mapping | Data dir bind-mounted to a host path (e.g. `./data/postgres`) |

All four services share one docker-compose network. Cloudflare Tunnel's ingress config points at `http://caddy:80` (or the host port Caddy is mapped to, if the tunnel runs outside this compose stack).

## Routing (Caddyfile)

Single hostname, path-based:

- `/api/*` → `backend`
- `/mcp/*` → `backend`
- everything else → `frontend`

## Persistence

- Postgres data: bind mount, host path → `/var/lib/postgresql/data`. Backup = stop the container and copy/dump the mounted directory.
- No other service holds persistent state; Diagrams and Revisions live only in Postgres.

## Secrets

Single `.env` file at the compose root, gitignored. An `.env.example` template lists the required keys without values:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
MCP_API_KEY=
```

`docker-compose.yml` references these via `env_file: .env` (or per-service `environment:` interpolation) — no secrets are baked into the compose file or images.
