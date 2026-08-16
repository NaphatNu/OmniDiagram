# MCP tool surface

Decided tool shapes for the Spring AI MCP Server module. This documents the *interface contract*, not the implementation — exact JSON schema/validation details are settled during implementation, not here.

Rationale for these choices lives in [ADR-0004](./adr/0004-mcp-identifies-diagrams-by-internal-id.md) (id-based identity), [ADR-0005](./adr/0005-diagram-delete-is-ui-only.md) (no delete), and [ADR-0006](./adr/0006-last-write-wins-concurrency.md) (concurrency).

All tools require the static MCP API key (see [ADR-0001](./adr/0001-no-auth-shareable-link-sharing.md)).

## `list_diagrams()`

No parameters. Returns every Diagram — no pagination, no filtering.

Returns: `[{ id, title, kind, updatedAt }]`

## `get_diagram(id)`

Returns: `{ id, title, kind, content, updatedAt }`

`content` is the raw DBML (SchemaDiagram) or Mermaid (GenericDiagram) text.

## `create_diagram(kind, title, content, format?)`

- `kind`: `"SchemaDiagram" | "GenericDiagram"`
- `content`: text
- `format`: required when `kind = SchemaDiagram` — `"dbml" | "sql"`. SQL input is converted to DBML server-side before storage (DBML is always the stored form). Ignored for `GenericDiagram` (always Mermaid).

Returns the created Diagram (same shape as `get_diagram`).

## `update_diagram(id, title?, content?, format?)`

Partial update — omit a field to leave it unchanged. `format` follows the same rule as `create_diagram` when `content` is provided for a SchemaDiagram.

Last-write-wins: no revision/version check, no conflict error. Every call still creates a new Revision snapshot.

## `export_diagram(id, format)`

`format` depends on `kind`:
- SchemaDiagram: `"dbml" | "sql-postgres" | "sql-mysql" | "sql-sqlserver" | "sql-sqlite" | "png" | "svg"`
- GenericDiagram: `"svg"`

Always returns content inline in the response — text formats as plain text, `png` as base64. No download URLs.

## No `delete_diagram`

Deletion is UI-only (see ADR-0005).
