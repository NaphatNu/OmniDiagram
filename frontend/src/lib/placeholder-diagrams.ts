import { Diagram } from "./types";

// Stand-in for the backend REST API (docs/mcp-tools.md / docs/deployment.md)
// until the Spring Boot service layer exists. Replace with real fetches
// against /api/diagrams once that lands.
export const placeholderDiagrams: Diagram[] = [
  {
    shareToken: "tt1-schema-orders",
    title: "Orders schema",
    kind: "SchemaDiagram",
    content: `Table orders {
  id integer [primary key]
  customer_id integer
  created_at timestamp
}

Table customers {
  id integer [primary key]
  name varchar
}

Ref: orders.customer_id > customers.id
`,
    updatedAt: "2026-08-15T09:30:00Z",
  },
  {
    shareToken: "tt2-checkout-flow",
    title: "Checkout flow",
    kind: "GenericDiagram",
    content: `flowchart TD
  A[Cart] --> B{Payment ok?}
  B -->|Yes| C[Confirm order]
  B -->|No| D[Show error]
`,
    updatedAt: "2026-08-14T16:05:00Z",
  },
];
