# Diagram deletion is UI-only; MCP has no delete tool

The Dashboard needs a way to remove Diagrams (behind a confirm dialog, hard delete from Postgres). The MCP tool surface, however, was already scoped to CRUD-minus-delete before this session — we're recording *why* here now that the UI side is decided too. The MCP write path is less supervised than the UI: a human clicking delete after a confirm dialog is a deliberate, in-the-moment act, while an AI agent acting on a static API key could delete a Diagram as a side effect of a larger, less-reviewed task. Keeping delete out of the MCP tool surface means the one truly destructive operation always requires a human at the keyboard.

## Consequences

An agent can create and pile up Diagrams via MCP but can never clean them up itself — a human has to periodically delete unwanted ones through the Dashboard. If an agent-managed workflow needs disposable/scratch Diagrams, those will accumulate until manually removed.
