# Caddy as reverse proxy, single hostname, path-based routing behind Cloudflare Tunnel

The homeserver already exposes services to the internet via a Cloudflare Tunnel. Rather than pointing the tunnel at each container individually, we're adding a Caddy container as the tunnel's single ingress target, with Caddy doing the internal fan-out to the Next.js frontend and Spring Boot backend (which also hosts the MCP endpoint). We chose Caddy over nginx for this because its config for simple reverse-proxying is a few lines versus nginx's more verbose block syntax, and the user already has prior Caddy experience. Within Caddy, we chose path-based routing (`/api/*` and `/mcp/*` to Spring Boot, everything else to Next.js) on a single hostname over separate subdomains per service, so the Cloudflare Tunnel ingress config only needs one hostname entry instead of two, and the frontend/backend share an origin (no CORS to configure).

## Consequences

`/api` and `/mcp` are reserved path prefixes that the Next.js app can never use for its own routes. Adding a future service behind this proxy means either another path prefix carved out of the same hostname, or a second Cloudflare Tunnel ingress rule for a new subdomain.
