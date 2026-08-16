# SchemaDiagram stays separate from Mermaid's erDiagram

Mermaid already ships an `erDiagram` type, which looks like it overlaps with SchemaDiagram's job of drawing tables and relationships. We deliberately kept them separate — and excluded `erDiagram` from GenericDiagram's supported types entirely — rather than unifying on Mermaid or teaching SchemaDiagram to import Mermaid ER syntax. Mermaid is a declarative, auto-layout-only renderer: its source format has no field for a table's position, so anything drawn with it can't support drag-to-position with persisted layout, and its parser has no SQL semantic layer to drive real DDL export. SchemaDiagram's job — designing a schema that becomes real, deployable SQL, arranged by hand — needs `@dbml/core` and an interactive canvas (react-flow); GenericDiagram's job is quick auto-laid-out communication diagrams. Building schema design on top of Mermaid would mean rebuilding `@dbml/core` and react-flow anyway, starting from a data model that was never meant to hold positions or typed columns.

## Consequences

Users who know Mermaid's ER syntax can't paste it directly into SchemaDiagram — only SQL DDL or `.dbml` are accepted as import formats. Documentation should make clear these are two different tools for two different jobs, not two ways to do the same thing.
