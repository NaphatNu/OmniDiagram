# Diagram updates use last-write-wins, no optimistic locking

[ADR-0002](./0002-postgresql-over-sqlite.md) moved us to Postgres specifically so an AI agent could write Diagrams concurrently with human editors without SQLite's file lock becoming a bottleneck. That raised the follow-up question: what happens when a human and an agent (or two agents) update the *same* Diagram at nearly the same time? We chose plain last-write-wins over optimistic locking (e.g. requiring `update_diagram` to pass a `baseRevisionId` that gets checked against the latest Revision) — this project already committed to "plain save/reload, no real-time multiplayer" as its concurrency model, and optimistic locking would mean every caller (UI and MCP agents alike) has to handle a reject-and-retry path for a race that, at solo/small-team scale, is rare. The existing Revision snapshot-on-every-save behavior is treated as the safety net instead of a lock: an overwritten edit isn't prevented, but it isn't lost either.

## Consequences

A concurrent update can silently overwrite another in-flight edit — no error is ever raised for a stale write. Recovering a clobbered edit means a human manually finding and reverting to the right entry in Revision history; the app itself does not detect or flag that a silent overwrite happened.
