# Dashboard (home page) UX — v1

## Layout

Flat list of all Diagrams, sorted by most-recently-updated first. Each row shows title, kind (SchemaDiagram/GenericDiagram), and last-modified time. No search, no filter, no folders/tags/grouping — the target user is solo with a small number of Diagrams, so recency sort is enough. This can be revisited later without a data model change (search/filter are additive).

## Create

"New Diagram" prompts for `kind` only, then opens straight into an empty editor (blank/template starting content) for that kind. There is no import-during-create step — importing SQL DDL or a `.dbml` file (see [ADR-0003](./adr/0003-schema-diagram-separate-from-mermaid-erdiagram.md)) happens from inside the editor once the Diagram already exists, not as a creation-time modal.

## Delete

Each row has a delete action behind a confirm dialog. This is a hard delete from Postgres, available only through the UI — see [ADR-0005](./adr/0005-diagram-delete-is-ui-only.md) for why MCP has no equivalent tool.
