# Incident log

A running record of bugs/failures that weren't obvious from reading the code — each one cost real debugging time once, so read this before repeating the same class of work. Rationale docs for planned decisions live in `docs/adr/`; this file is postmortems for things that broke in practice.

Format per entry: **Symptom**, **Root cause**, **Why it wasn't caught earlier**, **Fix**.

## 2026-08-17 — GHCR release workflow: two build failures on first real run (#19)

Landed in three PRs: #50 (workflow), #51 (fix 1), #52 (fix 2). Both bugs only surfaced because #19 was the first issue to actually run `docker build` against the images in CI — nothing before it did.

### Failure 1 — buildx cache export rejected by the default driver

**Symptom:** `.github/workflows/release.yml`'s first run failed immediately in `docker/build-push-action`:
```
ERROR: failed to build: Cache export is not supported for the docker driver.
Switch to a different driver, or turn on the containerd image store, and try again.
```

**Root cause:** `docker/build-push-action` was configured with `cache-from: type=gha` / `cache-to: type=gha,mode=max` (per #19's spec, to keep the Maven build fast). GitHub-hosted runners' preinstalled Docker uses the `docker` buildx driver by default, which doesn't support the `gha` cache exporter — only the `docker-container` driver does.

**Why it wasn't caught earlier:** #19's issue body specified `cache-from`/`cache-to: type=gha` but didn't mention `docker/setup-buildx-action`, which is what switches the driver. This is a gap in the issue spec, not a regression from an earlier merged issue — no prior issue touched Docker image builds at all (#3, the CI workflow, only runs `npm`/`mvn` — it never builds a Docker image).

**Fix:** add `docker/setup-buildx-action@v3` before `docker/build-push-action` in every job that uses `cache-from`/`cache-to: type=gha`.

### Failure 2 — `frontend/public/` missing on a fresh checkout

**Symptom:** after fixing the driver, the frontend leg failed:
```
ERROR: failed to build: failed to solve: failed to compute cache key:
failed to calculate checksum of ref ...: "/app/public": not found
```

**Root cause:** `frontend/Dockerfile`'s runtime stage does `COPY --from=build /app/public ./public`. `frontend/public/` exists on disk in every local working tree but has been **empty** since the repo's original scaffold commit (`64e6db6`, "Scaffold Next.js frontend, Spring Boot backend, and docker-compose topology" — this predates the tracked issue list; Next.js's App Router convention put `favicon.ico` under `src/app/` instead, so nothing ever landed in `public/`). Git does not track empty directories, so `frontend/public/` was **never actually committed** — a fresh `git clone`/CI checkout (what `actions/checkout` does) never had it, even though every local working copy that ran `npm run build`/`next dev` at least once did (Next.js may create files there, or the directory simply persisted from the original `create-next-app` scaffold before anything was deleted from it).

**Why it wasn't caught earlier:** no issue before #19 ever built the frontend Docker image from a clean checkout. #3 (CI workflow) runs `npm run build`, which doesn't fail on a missing `public/` — Next.js tolerates that fine. Only `docker build` from a truly fresh clone exercises the `COPY` that assumes the directory exists.

**Fix:** `frontend/public/.gitkeep` — tracks the (still-empty) directory in git. No Dockerfile change needed.

### Process note

PR #50's body contained "Closes #19", so the issue auto-closed the moment #50 merged — **before** #51/#52 (the actual fixes) landed and the pipeline worked end-to-end. Had to add a follow-up comment instead of `gh issue close` once truly verified. **Only put "Closes #N" on the PR you're confident is the final one for that issue** when a fix might need follow-up PRs.

### General lesson

Any future workflow/issue that runs `docker build` for the first time against a directory or cache backend that no prior issue has exercised should expect at least one failure mode invisible from reading the Dockerfile/workflow alone — plan to iterate against a real run, not just a YAML lint.

## 2026-08-17 — Cloudflare Access "exact match on `/`" is not a real Path-field mode (#21)

**Symptom:** while manually configuring the two Access applications from #21's spec, the Dashboard app's "Path (optional)" field has no way to express "root only, no subpaths." Leaving it empty and typing `/` were both tried; neither does what the issue text ("`omnidiagram.tonkla.studio/` — exact match") implies.

**Root cause:** Cloudflare Access's Path field on a self-hosted app's public hostname is purely prefix-based — there is no exact/no-subpaths mode. Confirmed against Cloudflare's own docs (`developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths`): an **empty Path matches the whole hostname, including every subpath** ("To protect an apex domain and all of the paths under it, leave the Path field empty"). Typing `/` doesn't help either — the UI already renders a separator slash before the Path input, so a literal `/` becomes a second, typed slash; the resulting rule matches a request path of `//`, which real browsers never send, so it silently protects nothing. There is no third option that means "this hostname's root, and only its root."

**Why it wasn't caught earlier:** #21's issue body was written from intent ("exact match") without verifying that Cloudflare's UI actually supports that as a distinct mode — this is dashboard configuration, not code, so nothing in the repo would have surfaced the gap; it only showed up once someone tried to enter the value.

**Fix:** don't try to make the Dashboard app itself path-restricted. Instead, lean on Cloudflare's real mechanism for "protect everything except these specific paths": leave the Dashboard app's Path empty (so it becomes the catch-all `Allow` policy for the whole hostname), then add one **separate self-hosted Access app per path that must stay public** (`/d/*`, `/api/diagrams/*`, `/mcp/*`, `/_next/*`), each with a **Bypass → Everyone** policy, not `Allow`. Cloudflare evaluates the most-specific path first, so each Bypass app wins over the catch-all for its own path and skips the Access login screen entirely — `Allow → Everyone` is a different policy type (still shows a login/Access screen) and would not work here. The `/api/admin/*` app from #21 stays as originally spec'd (`Allow`, specific emails) since it's meant to require login, not bypass it.

**General lesson:** when an issue's spec describes Cloudflare (or any SaaS dashboard) behavior in prose ("exact match", "wildcard", etc.), verify against that product's current docs before configuring — dashboard UI semantics don't show up in a code review and can drift from what the issue author assumed.

**Update:** the Dashboard route was subsequently moved to `/dashboard` (and the share route renamed `/d/{token}` → `/share/{token}`), so the Dashboard's Access app can use a real path-prefix match (`dashboard/*`) rather than the catch-all-plus-Bypass workaround described above — see `docs/deployment.md`.

## 2026-08-17 — First self-hosted runner deploy: `actions/checkout` wiped a manually pre-seeded `.env` despite `clean: false` (#20)

**Symptom:** the first-ever `deploy.yml` run (once the self-hosted runner finally came online — see #20's runner-registration steps) failed with the backend crashing on boot:
```
Binding to target dev.omnidiagram.backend.mcp.McpProperties failed:
    Property: mcp.apiKey
    Value: ""
    Reason: must not be blank
```
`omnidiagram-postgres-1` was also crash-looping with `Database is uninitialized and superuser password is not specified.` Both point at the same cause: every variable in `.env` read as empty by `docker compose`.

**Root cause:** before the runner had ever executed a real job, its work directory (`_work/OmniDiagram/OmniDiagram`) didn't exist yet, so `.env` couldn't be dropped in per `docs/deployment.md`'s step 2 ("create the `.env` file in that runner's checkout directory"). To work around the chicken-and-egg problem, the directory was pre-created by hand with a plain `git clone` and `.env` written into it *before* the runner's first job ran. When the actual `deploy.yml` job executed, `actions/checkout@v4` didn't recognize this manually-created `.git` as a trustworthy match for its expected state and did a full fresh checkout — which **replaces the entire working directory contents**, including untracked files, before the `clean: false` input ever comes into play. `clean: false` only skips the *post-checkout* `git clean -ffdx` step on an *existing, checkout-managed* repo; it does nothing to protect a directory checkout doesn't already recognize as its own. The `.env` written by hand was gone by the time `deploy.sh` ran.

**Why it wasn't caught earlier:** this is a first-run-only failure mode — every subsequent deploy reuses the same directory, which by then *is* a real `actions/checkout`-managed clone, so `clean: false` behaves as documented and `.env` survives normally. Nothing in local testing (Docker Compose run directly, e2e against a hand-built image) ever exercises `actions/checkout`'s repo-identity check, so this gap was invisible until the very first self-hosted job actually ran.

**Fix:** don't pre-seed `.env` via a manual `git clone` before the runner's first job. Instead: register + start the runner, let its first `deploy.yml` job run (or fail) to produce a real `actions/checkout`-managed directory, *then* write `.env` into that now-trusted checkout and re-run the job (`gh run rerun <run-id>`) — or, if a failure already happened and left containers crash-looping with blank env vars on a live host, recreate `.env` in place and `docker compose up -d --force-recreate` to recover immediately, then still re-run the workflow once so GitHub's own run history reflects a real, unassisted success rather than a manually-patched one.

**General lesson:** `actions/checkout`'s `clean` input only governs cleanup of a repo it already trusts — it is not a guarantee that arbitrary pre-existing directory contents survive. Never hand-seed a self-hosted runner's future checkout directory before that directory has been through at least one real `actions/checkout` run.

## 2026-08-18 — Cloudflare Access `dashboard/*` doesn't match the bare `/dashboard` path (#21)

**Symptom:** after configuring the Dashboard's Access app with Path `dashboard/*` (per `docs/deployment.md`'s post-rename config) and deploying, a live unauthenticated `curl` check showed `/api/admin/diagrams` correctly 302-redirecting to Cloudflare's login page, but a plain `GET https://omnidiagram.tonkla.studio/dashboard` (no trailing slash, no subpath) returned `200` straight from the origin — the actual Dashboard homepage, fully rendered, no login required. `/dashboard/` and `/dashboard/anything` were both correctly gated; only the bare path slipped through.

**Root cause:** Cloudflare Access's `Path` field with a trailing `/*` (`dashboard/*`) matches `/dashboard/` plus anything after it, but does **not** match the path `/dashboard` on its own (no trailing slash, nothing after it) — the same underlying prefix-only matching behavior already logged in this file's 2026-08-17 entry, but manifesting differently here: that entry was about there being no *exact-root* mode; this is about a *prefix* pattern silently excluding the bare path it's supposedly a prefix of. The Next.js Dashboard page is served at exactly `/dashboard` with no trailing slash, so it fell squarely into the gap.

**Why it wasn't caught earlier:** nothing in the local/e2e test suite exercises Cloudflare Access at all (it's infrastructure-layer, not app-layer), and the issue's own verification checklist (written before the `/dashboard` rename) checked "Access login prompt" only at a general level, not specifically the bare path with no trailing slash vs. a subpath. It only surfaced from a real unauthenticated `curl -D -` against the live deployment, checking response headers rather than just status codes.

**Fix:** add a second Cloudflare Access application for the same hostname with Path set to exactly `dashboard` (no `/*`), same `Allow → tonklanapat@gmail.com` policy as the existing `dashboard/*` app. Two apps now cover the Dashboard: `dashboard` (exact) and `dashboard/*` (prefix, everything under it) — see `docs/deployment.md`.

**General lesson:** when verifying any path-based access-control layer (Cloudflare Access or otherwise), test the exact boundary path with **no trailing slash and no subpath**, not just a representative subpath — prefix patterns like `x/*` are easy to assume cover `x` itself and often don't.

## 2026-08-18 — Caddy's `handle /mcp/*` never matched the real `/mcp` endpoint (#21)

**Symptom:** while running #21's verification table against the live deployment, `POST https://omnidiagram.tonkla.studio/mcp` (no trailing slash — the actual MCP endpoint, both for the "no API key → 401" and "with API key → works" checks) returned `404` instead of reaching the backend at all. `POST /mcp/` (with a trailing slash nobody would ever actually request) correctly reached the backend and got `401`.

**Root cause:** `Caddyfile`'s `handle /mcp/* { reverse_proxy backend:8080 }` only matches paths that start with `/mcp/` followed by at least one more character — it does not match the bare path `/mcp`. Spring AI's MCP server autoconfiguration (`STREAMABLE` protocol, no `mcp-endpoint` override in `application.yml`) serves the Streamable HTTP endpoint at exactly `/mcp`, with no trailing slash. A request to the real endpoint fell through Caddy's `handle /mcp/*` block entirely and hit the final catch-all `handle { reverse_proxy frontend:3000 }`, which 404'd it as an unknown Next.js route. This is the same class of bug as this file's two Cloudflare Access entries above (a `/*` prefix pattern silently excluding its own bare path) — Caddy's path matcher has the identical gap.

**Why it wasn't caught earlier:** no e2e test or local verification ever exercised the MCP endpoint through Caddy specifically — local dev and the isolated-Docker-network e2e recipe both talk to the backend directly or through a different path, never through this exact Caddyfile. It only surfaced when #21's verification table was run against the real deployment for the first time.

**Fix:** two separate `handle` blocks, one for `/mcp` and one for `/mcp/*`, both `reverse_proxy backend:8080`. (An earlier attempt at this fix tried `handle /mcp /mcp/*` as a single block — that is invalid Caddyfile syntax and caused a real outage; see the next entry.)

**General lesson:** any reverse-proxy or gateway rule written as `path/*` should be checked against the bare `path` with no trailing slash, the same way as the Cloudflare Access entries above — this has now shown up in two independent systems (Cloudflare Access and Caddy) on the same route shape.

## 2026-08-18 — Caddy outage from invalid multi-path `handle` syntax + stale bind-mounted Caddyfile (#21)

**Symptom:** while deploying the fix for the entry above, `docker exec omnidiagram-caddy-1 cat /etc/caddy/Caddyfile` kept showing the *old* (pre-fix) content even after a successful `deploy.yml` run — pointing at a second, separate problem: the running Caddy container wasn't seeing the new file at all. Manually restarting the container to force it to re-read the file then surfaced a *third* problem: Caddy crash-looped with `Error: adapting config using caddyfile: parsing caddyfile tokens for 'handle': wrong argument count or unexpected line ending after '/mcp/*'` — taking the entire site down (Caddy is the only thing Cloudflare Tunnel forwards to; nothing served on port 8090 while it's crash-looping).

**Root cause, two independent bugs:**
1. **Stale bind mount:** `docker-compose.yml` bind-mounts the single file `./Caddyfile:/etc/caddy/Caddyfile`. `git checkout` (part of every `deploy.yml` run) replaces a changed file via unlink+rename rather than editing it in place, which gives the file a new inode. A container's existing single-file bind mount stays attached to the *old* inode, so a running Caddy container keeps serving whatever Caddyfile existed when it last started, no matter how many times the host file changes underneath it — and `docker compose up -d` doesn't recreate `caddy` on its own, because nothing in `caddy`'s compose service definition (image, env, etc.) ever changes, only the mounted file's content.
2. **Invalid syntax in the attempted fix:** the previous entry's fix was written as `handle /mcp /mcp/* { ... }`, assuming (incorrectly) that Caddy's `handle` directive accepts multiple space-separated path patterns the way its `path` matcher does. It does not — `handle` takes exactly one path argument, and a second one is a syntax error that fails config adaptation entirely, so Caddy never starts.

**Why it wasn't caught earlier:** bug 1 is invisible until a second Caddyfile-only change is deployed (the very first deploy always sees a freshly-created container with no stale mount to begin with, so this session's earlier `.env` incident never exposed it). Bug 2 is a plain syntax mistake that a local `caddy validate` or even a `docker compose up` dry run against the real Caddyfile would have caught before it ever reached the live host — it wasn't run because the change looked trivial enough to skip that step.

**Fix:** `deploy.sh` now runs `docker compose restart caddy` unconditionally after `docker compose up -d`, every deploy, so a changed Caddyfile always takes effect regardless of whether compose thinks the service definition changed. The invalid syntax was replaced with two separate `handle /mcp { ... }` / `handle /mcp/* { ... }` blocks (valid, and what the previous entry's fix should have been from the start).

**General lesson:** for any service where the interesting content lives in a bind-mounted file rather than the image (Caddy, nginx, etc.), assume the running container will *not* see host-side changes to that file until it's restarted — mounting is not the same as watching. And validate config-file syntax changes locally (`caddy validate --config Caddyfile` here) before deploying, the same discipline as running tests before merging code — a config file is code.

## 2026-08-18 — Dashboard can never load diagrams or create one: `/dashboard` and `/api/admin/*` are different Cloudflare Access "applications" with different `aud`s, so logging into one doesn't authorize the other (#21)

**Symptom:** first real interactive login test (Safari/iPadOS) against the live site: `/dashboard` loads and prompts for Access login as expected, login succeeds — but the page then shows "Failed to load diagrams", and tapping New Diagram > SchemaDiagram/GenericDiagram does nothing (the dropdown closes as designed, but no diagram is created and no error is shown).

**Root cause:** confirmed by comparing the two apps' unauthenticated 302 redirects (`curl -D -` against `/dashboard` and `/api/admin/diagrams`) — each redirects to Cloudflare's login endpoint with a **different `kid`/`aud`** (`3d503a09…` for the Dashboard apps vs. `5fff04c9…` for the Admin API app), because `docs/deployment.md`'s Access config (landed while closing out #21) deliberately created these as three separate Cloudflare Access Applications: `dashboard`, `dashboard/*`, `api/admin/*`. Cloudflare Access authenticates per-application, not per-hostname: completing the login flow for one app's `aud` sets a `CF_Authorization` cookie valid only for that `aud`; a request to a different app on the same hostname gets its own independent 302-to-login. That's fine for a normal top-level navigation (the browser follows the redirect chain, including the cross-origin hop to `<team>.cloudflareaccess.com`, and completes it — silently if there's already an SSO session with the identity provider, or with a fresh OTP prompt if not). It is **not** fine for `frontend/src/lib/api.ts`'s `fetch()` calls (`listDiagrams`/`createDiagram`/etc., no `credentials` option set, so the default `"same-origin"` applies): those calls target `/api/admin/*` in the background, get redirected to `cloudflareaccess.com` for the `api/admin/*` app's login, and — because that hop is cross-origin and the fetch's credentials mode is `"same-origin"` — the browser does **not** send or accept cookies for that hop, so Cloudflare can't silently recognize the already-authenticated identity from the Dashboard login. The fetch lands on Cloudflare's interactive login HTML (200 OK) instead of JSON. `response.json()` throws, the `request()` helper's catch swallows it into an `ApiError`, and the UI shows "Failed to load diagrams" (`Dashboard`'s `load()` catch) or silently no-ops (`NewDiagramButton.handleCreate`'s catch just resets `creating`, with no error UI). Because the app has no code path that does a real top-level navigation to anything under `/api/admin/*`, this Access app's login can **never** be completed through normal app usage — this reproduces 100% of the time, for every browser, not just Safari.

**Why it wasn't caught earlier:** every previous "verification" of #21 (this file's two prior 2026-08-18 entries, and the handoff doc's "already passing" checklist) only checked **unauthenticated** responses (`curl`, no cookies) — confirming the 302-to-login happens, never confirming what happens *after* a real login. This was the first session with an actual interactive Access login by the real user. Nothing in local/CI testing exercises Cloudflare Access at all (already noted in this file's 2026-08-17 entries), so this class of bug is invisible to anything except a live, authenticated, real-browser pass.

**Fix (decided after discussion, not (a) or (b) below):** given this is a single-user app, the user opted to drop Cloudflare Access entirely rather than patch around its multi-`aud` model — an identity-provider/OTP flow wasn't earning its complexity here. Replaced with a Caddy `basic_auth` block wrapping `/dashboard` and `/api/admin/*` (see [docs/deployment.md](./deployment.md#access-control), [ADR-0010's amendment](./adr/0010-cloudflare-access-guards-dashboard-only.md#amendment-superseded-mechanism)). Basic Auth credentials are attached by the browser to every same-origin request automatically, page loads and `fetch()` alike — there's no session/cookie/redirect chain to have a cross-`aud` gap in, so this class of bug can't recur. Validated locally before deploy: `caddy validate` against the new Caddyfile, plus a standalone `docker run` of just the `caddy` image on an isolated network confirming `401` on `/dashboard` and `/api/admin/diagrams` without credentials, `502` (reached the proxy stage — no real upstream in that isolated test) with correct credentials, and `502` (never gated) on `/share/*` and `/api/diagrams/*` — this repo's Caddyfile-syntax-mistake outage earlier in this file is exactly why that validation step happened before touching the live host.

Two approaches were considered and rejected in favor of the above: (a) collapse the three Access Applications into one covering the whole hostname (empty Path) with Bypass sub-apps for the public routes — the same pattern already used and abandoned in this file's 2026-08-17 "exact match" entry, which would give `/dashboard*` and `/api/admin/*` the same `aud` again, still via Cloudflare Access; or (b) keep the apps split but add `credentials: "include"` to `frontend/src/lib/api.ts`'s `fetch()` call so the cross-origin hop to `cloudflareaccess.com` carries the existing SSO cookie — never tested, and still leaves Cloudflare Access's per-application `aud` model as a foot-gun for the next path added.

**General lesson:** when an app has multiple Cloudflare Access "applications" on the same hostname, treat them as **fully independent auth domains** — a passing login for one proves nothing about any other, and any client-side code that reaches a *different* app only via `fetch()` (never a real top-level navigation) has no way to ever complete that app's login. Verify Access setups with a real authenticated session hitting every protected path the app's JS actually calls in the background, not just the paths a user navigates to directly.

## 2026-08-18 — Docker Compose silently corrupts `$` in `.env` values (`ADMIN_BASIC_AUTH_HASH`) (#21)

**Symptom:** right after deploying the Caddy Basic Auth fix from the entry above, `/dashboard` correctly returned `401` with no credentials — but also returned `401` with the *correct* username/password. Caddy itself was healthy (no crash-loop, container freshly up), so this wasn't the same class of bug as the earlier Caddyfile outage.

**Root cause:** confirmed by reproducing in an isolated throwaway `docker-compose.yml`/`.env` (not touching the live host): Docker Compose interpolates `$` sequences **inside `.env` file values themselves**, not just inside `docker-compose.yml`. `ADMIN_BASIC_AUTH_HASH`'s bcrypt hash (`$2a$14$u/QyBk6dez2iGB8T1aSvhuNWnT8I3U/EO2FWNjUl2Ncc4pyr3tWRa`) contains several `$X` sequences that look like variable references to Compose's interpolation engine. `$u` (immediately following `$14$`) was read as a reference to an unset variable named `u`, silently dropped (`docker compose` emits `The "u" variable is not set. Defaulting to a blank string.` — easy to miss among routine output), and the value that actually reached the container had a chunk removed from the middle: `$2a$14/QyBk6dez2iGB8T1aSvhuNWnT8I3U/...` instead of `$2a$14$u/QyBk6dez2iGB8T1aSvhuNWnT8I3U/...`. This happens at `.env`-parsing time — it reproduced identically whether `docker-compose.yml` referenced the variable via `${ADMIN_BASIC_AUTH_HASH}` interpolation syntax or the bare `- ADMIN_BASIC_AUTH_HASH` short form, ruling out `docker-compose.yml` itself as the site of corruption.

**Why it wasn't caught earlier:** `MCP_API_KEY` (this repo's only prior secret with any structure) is a plain alphanumeric string with no `$` in it, so nothing before now ever put a `$`-containing value through Compose's `.env` handling. Nothing about this is visible from reading `docker-compose.yml` or the Caddyfile — the corruption happens in Compose's env-file loader, a layer neither file controls.

**Fix:** escape every literal `$` in a `.env` value as `$$` — standard Compose escaping, confirmed by testing both the broken and escaped forms in isolation before touching the live host again. `.env.example` and `docs/deployment.md` now say so explicitly for `ADMIN_BASIC_AUTH_HASH`. The live `.env` itself couldn't be hand-edited this time either (same permission wall as always — see the `.env`-wipe entry above, and neither the user nor Claude had a session at the physical/SSH-accessible host at the time), so the fix was reissued as a one-off step in `deploy.sh` — this runner is the only thing with write access to `.env` — then removed again in a follow-up PR once a real end-to-end `curl -u` against the live domain confirmed `401` with no/wrong credentials and `200` plus successful create/delete with the correct ones.

**General lesson:** any secret or generated value that might contain `$` (bcrypt/htpasswd hashes, JWTs, some base64 output) needs `$$`-escaping before it goes in a Compose `.env` file — this is a Compose-wide gotcha, not specific to Caddy or Basic Auth, and will bite the next `$`-shaped secret this project adds too.
