# No user accounts — sharing is by per-Diagram link only

OmniDiagram is self-hosted on a homeserver for primarily solo use, with occasional sharing to a small trusted team over VPN/LAN. Rather than building accounts, sessions, and permission tiers, each Diagram gets a unique shareable link; possessing the link is sufficient to view and edit it. We chose this over per-user accounts with permissions because the network boundary (VPN/LAN) already provides the trust boundary this deployment needs, and account infrastructure would be pure overhead for a homeserver tool. The MCP integration is the one exception: its endpoint requires a static API key, since it's a second, less-supervised write path into the same Diagrams (see [[adr-0002]] for how this interacts with concurrency).

## Consequences

Anyone who obtains a Diagram's link — including by it leaking outside the trusted network — can edit or delete it. Adding accounts later means retrofitting ownership onto every existing Diagram.
