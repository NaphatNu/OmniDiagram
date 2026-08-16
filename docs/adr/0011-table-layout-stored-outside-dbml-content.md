# SchemaDiagram table positions are stored in a `layout` column, separate from DBML content

[CONTEXT.md](../../CONTEXT.md) defines a SchemaDiagram as a canvas "where tables can be dragged into position," and [ADR-0003](./0003-schema-diagram-separate-from-mermaid-erdiagram.md) leans on exactly that to reject Mermaid: "its source format has no field for a table's position, so anything drawn with it can't support drag-to-position with persisted layout."

DBML has the same gap. It describes tables, columns, and references, but has nowhere to record where a table sits on a canvas — so storing positions inside `content` is not an option, and the argument that separates SchemaDiagram from Mermaid would apply to our own storage format.

Positions therefore live in a `layout JSONB` column on `diagrams`, keyed by table name (`{"orders": {"x": 0, "y": 0}}`). Keeping it out of `content` means the DBML an agent reads and writes through MCP stays exactly the DBML a human sees, and an agent that rewrites `content` never has to understand or preserve coordinates. A Revision snapshots both columns, so reverting restores the diagram as it looked, not just as it parsed.

We chose a JSONB column over a separate `diagram_layouts` table because positions are only ever read and written together with their Diagram, so a join would buy nothing at solo scale.

## Consequences

`layout` can drift out of sync with `content`: renaming a table in DBML orphans its entry, and adding one leaves it unpositioned. The editor has to tolerate both — falling back to an auto-placed position for unknown tables and ignoring stale keys — rather than assuming the two columns agree. Querying or migrating positions means JSON operators instead of plain columns.
