# Cloudflare Access guards the Dashboard and admin API; share links stay public

[ADR-0001](./0001-no-auth-shareable-link-sharing.md) justified having no accounts by saying "the network boundary (VPN/LAN) already provides the trust boundary this deployment needs." Publishing OmniDiagram at `omnidiagram.tonkla.studio` through the existing Cloudflare Tunnel removes that boundary: the app is now reachable by anyone on the internet.

Left fully public, two things break. The Dashboard lists every Diagram, so share tokens stop being secrets — no link is needed to find anything. And [ADR-0005](./0005-diagram-delete-is-ui-only.md) kept delete out of MCP specifically so "the one truly destructive operation always requires a human at the keyboard," but a public Dashboard means *any* human at *any* keyboard, with only a confirm dialog in the way.

We put Cloudflare Access in front of the Dashboard page and the admin API, and left everything else public. Access checks identity at Cloudflare's edge before traffic reaches the tunnel, so the app itself still has no accounts, sessions, or permission tiers — ADR-0001's actual decision survives; only its assumption about *where* the trust boundary sits has moved from the LAN to Cloudflare.

Because an Access application is defined by hostname and path and cannot match on HTTP method, enumerating and destructive operations had to move to their own prefix rather than being distinguished by verb:

| Behind Access | Public |
|---|---|
| `GET /dashboard` (Dashboard) | `GET /share/{shareToken}` |
| `GET /api/admin/diagrams` | `GET /api/diagrams/{shareToken}` |
| `POST /api/admin/diagrams` | `PUT /api/diagrams/{shareToken}` |
| `DELETE /api/admin/diagrams/{shareToken}` | `/mcp/*` (static API key), `/_next/*` |

## Consequences

Anyone with a share link can still read and overwrite that Diagram, and `/mcp/*` still faces the internet behind nothing but a static key — so that key is now a genuine internet-facing secret rather than a LAN formality. Enforcement lives at Cloudflare, not in the app: reaching the backend by any path that bypasses the tunnel bypasses Access entirely, and running the stack locally means no protection at all. The Access policy for the Dashboard is scoped to the `/dashboard` path prefix; matching the bare hostname would swallow `/share/*` and break every share link.
