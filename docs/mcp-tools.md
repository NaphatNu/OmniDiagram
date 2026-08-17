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
- `format`: required when `kind = SchemaDiagram` — `"dbml" | "sql"`. SQL input is converted to DBML before storage (DBML is always the stored form) via the conversion service in the Next.js app — see [ADR-0009](./adr/0009-dbml-sql-conversion-lives-in-nextjs.md). Ignored for `GenericDiagram` (always Mermaid).

Returns the created Diagram (same shape as `get_diagram`).

## `update_diagram(id, title?, content?, format?)`

Partial update — omit a field to leave it unchanged. `format` follows the same rule as `create_diagram` when `content` is provided for a SchemaDiagram.

Last-write-wins: no revision/version check, no conflict error. A new Revision snapshot is created whenever `content` or layout changes; a title-only update creates none (a Revision captures content and layout, per [CONTEXT.md](../CONTEXT.md)).

## `export_diagram(id, format)`

`format` depends on `kind`:
- SchemaDiagram: `"dbml" | "sql-postgres" | "sql-mysql" | "sql-sqlserver"`
- GenericDiagram: `"mermaid"`

Always returns content inline in the response as plain text. No download URLs.

`sql-sqlite` is deliberately absent: `@dbml/core`, the library that implements the conversion (see below), silently returns an empty string for the `sqlite` dialect on both import and export instead of converting or erroring, in every published version through 10.1.1. It is not a usable dialect, so `create_diagram`/`update_diagram`/`export_diagram` only accept SQL for postgres, mysql, and mssql.

**Text only.** Image formats (`png`, `svg`) are deliberately absent: both SchemaDiagram (react-flow) and GenericDiagram (Mermaid) need a real DOM to render, so serving them from MCP would mean running headless Chrome in the backend. Image export is a UI feature instead — the browser has already rendered the diagram, so it exports client-side at no extra cost.

SQL formats are produced via the conversion service in the Next.js app (see [ADR-0009](./adr/0009-dbml-sql-conversion-lives-in-nextjs.md)).

## No `delete_diagram`

Deletion is UI-only (see ADR-0005).
