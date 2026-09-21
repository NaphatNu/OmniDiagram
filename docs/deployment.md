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

Production secrets live as stack environment variables in Portainer on `kla-server`, never in either repo. `home-server-deploy/stacks/omnidiagram/.env.example` lists which variable belongs where; `compose.yml` guards each one with `${VAR:?}` so a missing value fails the deploy with a message naming it instead of starting a half-configured container.

Locally, `compose.dev.yml` has working defaults for everything, so an `.env` file is optional. If you want one, it goes at the repo root, is gitignored, and takes the same keys:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
MCP_API_KEY=
ADMIN_BASIC_AUTH_USER=
ADMIN_BASIC_AUTH_HASH=
```

`MCP_API_KEY` and `ADMIN_BASIC_AUTH_USER`/`ADMIN_BASIC_AUTH_HASH` are internet-facing (see ADR-0010) — treat them as real secrets, not a LAN formality. Generate the Basic Auth hash with `docker run --rm caddy:2-alpine caddy hash-password --plaintext '<password>'`; only the bcrypt hash goes in `.env`, never the plaintext password. **Double every `$` in the hash to `$$`** before writing it to `.env` — Compose interpolates `$` in `.env` values itself and silently corrupts anything that looks like a variable reference (bcrypt hashes are full of `$`); see [docs/incidents.md](./incidents.md#2026-08-18--docker-compose-silently-corrupts--in-env-values-admin_basic_auth_hash-21).

## CI/CD

Everything runs on GitHub-hosted runners. There is no self-hosted runner and nothing in this repo executes on `kla-server`.

`ci.yml` is one pipeline, linked with `needs:`, so a red test suite stops the change from going anywhere:

```
frontend ─┐
          ├─→ release ─→ bump-deploy-repo
backend  ─┘
```

- **frontend / backend** — lint, typecheck, Vitest, Playwright, and `mvn verify` (Testcontainers). These run on pull requests too.
- **release** — `push` events only. Builds both images and pushes them to GHCR tagged `sha-<short>`; a `vX.Y.Z` tag push also publishes the bare version. There is no `latest`: an image tag has to identify one build, or "which version is running" has no answer.
- **bump-deploy-repo** — `refs/heads/main` only. Commits the new `IMAGE_TAG` and a copy of `caddy/Caddyfile` into [`home-server-deploy`](https://github.com/NaphatNu/home-server-deploy) at `stacks/omnidiagram/`. Routing rules travel with the image that expects them, in one commit.

Deployment itself is a pull, not a push: Portainer on `kla-server` polls that repo every few minutes and applies what it finds. Nothing here reaches the host, and the host accepts no inbound connection — `ufw` denies incoming, so a webhook could not arrive even if one were configured.

Docs-only changes are skipped via `paths-ignore` (`**.md`, `docs/**`). Without it, editing a file like this one produces a new image and a deploy-repo commit announcing a version that contains no code change.

### Rolling back

Edit `IMAGE_TAG` in `home-server-deploy/stacks/omnidiagram/.env` to any tag that exists in GHCR and commit — on github.com is fine. Portainer picks it up on its next poll. `git log` on that repo is the deploy history, which is also why the tag must never be set in Portainer's UI: a value set there overrides the file permanently, and CI would then keep committing tags that silently never take effect.

### Security of the deploy credential

`bump-deploy-repo` declares `environment: production`, which holds the only token that can write the deploy repo. That environment is restricted to `main`, and GitHub evaluates the restriction against the run's `GITHUB_REF` — `refs/pull/N/merge` for pull requests. A branch that edits the workflow to print the token therefore cannot obtain it, and the rule is enforced server-side rather than by anything in the workflow file. Keep **require approval for workflow runs from outside collaborators** enabled in Settings → Actions, and if this repo ever gains collaborators, add required reviewers to the environment so every deploy needs an approval.
