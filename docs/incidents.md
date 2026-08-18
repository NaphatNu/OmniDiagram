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
