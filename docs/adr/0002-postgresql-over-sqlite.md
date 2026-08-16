# PostgreSQL instead of SQLite

The backend is Spring Boot on the same homeserver, and the initial instinct for a single-user, self-hosted tool was SQLite — a single file, no service to run. We picked PostgreSQL instead for two reasons: it's the natural fit for the Spring/Spring AI ecosystem (including the Spring AI MCP Server Boot Starter), and once the MCP server lets an AI agent write Diagrams concurrently with human editors over their shareable links, SQLite's whole-file write lock becomes a real bottleneck rather than a theoretical one. Postgres handles concurrent writes natively and runs as one more container alongside the Next.js frontend and Spring Boot backend.

## Consequences

Deployment needs a third container instead of a single embedded file, and backup is "dump the database" rather than "copy a file."
