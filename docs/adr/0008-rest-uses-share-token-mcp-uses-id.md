# REST identifies Diagrams by shareToken; MCP keeps using internal id

[ADR-0004](./0004-mcp-identifies-diagrams-by-internal-id.md) settled that MCP tools address Diagrams by internal id. It never covered the REST API the browser calls, because no REST contract existed yet. Scaffolding forced the question: the editor route is `/d/{shareToken}`, so the only identifier the page holds is the token.

We chose `shareToken` as the sole REST identifier rather than exposing internal ids to the browser. [ADR-0001](./0001-no-auth-shareable-link-sharing.md) makes possession of the link the entire access mechanism, so the token is already the browser's credential — routing REST through it keeps one identifier in the client and leaves the internal id purely server-side, so token rotation invalidates old links exactly as intended. MCP keeps using id per ADR-0004: an agent holding the API key is a more privileged caller and should not be coupled to link rotation.

The service layer therefore exposes both lookups (`findByShareToken` for REST, `findById` for MCP) over one implementation.

## Consequences

Two identifiers now address the same aggregate, and every service method needs to be clear about which one it takes — a mix-up would let a caller pass an id where a token is expected and silently 404, or worse, leak internal ids into the client. Rotating a Diagram's shareToken breaks any REST URL a human has bookmarked while leaving agent references intact.
