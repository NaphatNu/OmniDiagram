# OmniDiagram

A self-hosted, diagram-as-code tool that combines interactive database schema design with general-purpose diagramming, so both jobs can be done from one deployment without accounts.

## Language

**Diagram**:
A saved, shareable unit of visual content. Every Diagram has an id, a title, a shareable link, and a *kind* that determines how it's authored and rendered.
_Avoid_: Document, Project, File

**SchemaDiagram**:
A Diagram authored in DBML, rendered as an interactive canvas where tables can be dragged into position, and exportable to real SQL DDL. Used for designing a database schema that will actually be deployed.
_Avoid_: ERD, Database diagram — both are ambiguous with what Mermaid calls an `erDiagram`; this project always means SchemaDiagram when a schema needs to become real SQL.

**GenericDiagram**:
A Diagram authored in Mermaid syntax, auto-laid-out and rendered to SVG. Used for communicating logic or process, not for producing a deployable schema. In v1, limited to Flowchart and Sequence diagram types — Mermaid's own `erDiagram` type is deliberately excluded because that job belongs to SchemaDiagram (see [ADR-0003](./docs/adr/0003-schema-diagram-separate-from-mermaid-erdiagram.md)).
_Avoid_: Mermaid diagram — kind name is GenericDiagram, "Mermaid" is just its source syntax.

**Shareable link**:
The sole access mechanism for a Diagram. Possessing the link is sufficient to view and edit — there are no user accounts (see [ADR-0001](./docs/adr/0001-no-auth-shareable-link-sharing.md)).
_Avoid_: Share URL, invite link

**Revision**:
A snapshot of a Diagram's content *and* layout captured on every save, kept so an edit — human or AI agent — can be reverted. Saves are explicit (a Save button), not autosave, so revisions stay coarse enough to be worth reverting to.
_Avoid_: Version, History entry

**Layout**:
Where each SchemaDiagram table sits on the canvas, stored separately from the DBML content because DBML has no field for position (see [ADR-0011](./docs/adr/0011-table-layout-stored-outside-dbml-content.md)). GenericDiagrams have no Layout — Mermaid auto-lays-out.
_Avoid_: Positions, Coordinates
