# DBML↔SQL conversion runs in the Next.js app, not the Spring Boot backend

[docs/mcp-tools.md](../mcp-tools.md) requires `create_diagram(format: "sql")` to convert SQL DDL into DBML *server-side*, and `export_diagram` to emit `sql-postgres`, `sql-mysql`, `sql-sqlserver`, and `sql-sqlite`. Both were specified before anyone checked whether the JVM can do them.

It cannot, in practice. [`@dbml/core`](https://dbml.dbdiagram.io/js-module/core/) is the reference DBML implementation and the only one that does the full round trip — parse DBML, parse SQL from several dialects, and emit SQL per dialect — and it is JavaScript. The one JVM option, [`io.github.nilswende:dbml-java`](https://github.com/nilswende/dbml-java), offers only `DbmlParser` and `DbmlPrinter`: it reads and writes DBML but has no SQL import and no multi-dialect DDL export, and its last release is over a year old.

So the conversion runs where `@dbml/core` already runs. The Next.js app exposes internal routes under `/api/internal/dbml/*`, and Spring Boot calls them over the compose network when it needs a conversion. We chose this over a fifth "conversion" container because `@dbml/core` is already a frontend dependency (the SchemaDiagram editor parses DBML in the browser), so this adds routes rather than a service, a Dockerfile, and a CI job. We rejected reimplementing four SQL dialects on top of `dbml-java` as a large, permanently-diverging surface that still would not solve SQL import.

## Consequences

The backend now depends on the frontend at runtime for SQL import/export, inverting the usual direction — if the frontend container is down, those MCP tools fail while the rest of the API keeps working. The `/api/internal/*` prefix must never be exposed through Caddy, or anyone could reach it from the internet. Conversion also costs an extra internal HTTP hop, and errors from `@dbml/core` have to be translated into meaningful MCP tool errors across that boundary.

`sql-sqlite` turned out not to be deliverable: `@dbml/core` (through the latest published 10.1.1) silently returns an empty string for the `sqlite` dialect on both import and export, rather than converting or throwing. There is no newer major version that adds it. `/api/internal/dbml/*` and `export_diagram` therefore only support `postgres`, `mysql`, and `mssql` — see [docs/mcp-tools.md](../mcp-tools.md).
