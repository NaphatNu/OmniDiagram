# MCP tools identify Diagrams by internal id, not shareable link

MCP tools could reference a Diagram either by its internal id or by its shareable link token (the identifier humans use). We chose internal id for every tool (`get_diagram`, `update_diagram`, `export_diagram`). An agent holding the MCP API key is already a privileged caller — more privileged than a human who only has a link — so there's no reason to make it resolve diagrams the same way a human does. `list_diagrams` always returns each Diagram's id, so an agent can discover ids without needing the shareable link at all. This also decouples MCP tool calls from link rotation: if a Diagram's shareable link is ever regenerated, in-flight or cached agent references by id keep working.

## Consequences

An agent must call `list_diagrams` (or already know an id from a prior `create_diagram` call) before it can `get`, `update`, or `export` a Diagram — there is no tool that resolves a shareable link into an id or vice versa.
