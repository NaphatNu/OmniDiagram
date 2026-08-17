import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SchemaDiagramEditor } from "./SchemaDiagramEditor";

function renderEditor(content: string) {
  return render(
    <SchemaDiagramEditor content={content} onContentChange={vi.fn()} layout={{}} onLayoutChange={vi.fn()} />,
  );
}

describe("SchemaDiagramEditor relationships", () => {
  it("gives every field row a source and target Handle so edges can anchor at field granularity", () => {
    // Actual .react-flow__edge presence needs real layout/geometry (viewport
    // transforms, handle bounding rects) that jsdom doesn't provide even with
    // ResizeObserver/DOMMatrixReadOnly stubbed — that's covered in
    // e2e/relationships.spec.ts against a real browser instead. This checks
    // the piece that *is* meaningfully jsdom-testable: every field is wired
    // as a connectable endpoint in both directions.
    renderEditor(
      "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\nTable customers {\n  id integer [primary key]\n}\nRef: orders.customer_id > customers.id\n",
    );
    expect(document.querySelector('[data-handleid="customer_id"][data-handlepos="left"]')).not.toBeNull();
    expect(document.querySelector('[data-handleid="customer_id"][data-handlepos="right"]')).not.toBeNull();
    expect(document.querySelector('[data-handleid="id"][data-nodeid="customers"]')).not.toBeNull();
  });

  it("names the broken reference instead of crashing when a Ref points at a table that doesn't exist", () => {
    // @dbml/core validates Ref endpoints at parse time (confirmed directly
    // against the library), so this never reaches buildRelationshipEdges's
    // own dangling-flagging in practice — it surfaces through the existing
    // whole-document parse-error path instead, whose message already names
    // the missing table. relationships.test.ts covers dangling-detection
    // itself as pure data, per a parser that didn't already reject it.
    renderEditor(
      "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\nRef: orders.customer_id > missing_table.id\n",
    );
    expect(screen.getByText(/missing_table/)).toBeInTheDocument();
    expect(document.querySelector(".react-flow__node")).toBeNull();
  });

  it("parses and renders a self-referencing Ref's table without treating it as a broken reference", () => {
    renderEditor(
      "Table orders {\n  id integer [primary key]\n  parent_order_id integer\n}\nRef: orders.parent_order_id > orders.id\n",
    );
    expect(document.querySelector('[data-testid="rf__node-orders"]')).not.toBeNull();
    expect(screen.queryByText(/Broken reference/)).not.toBeInTheDocument();
  });
});
