import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SchemaDiagramEditor } from "./SchemaDiagramEditor";
import { RELATIONSHIP_TYPE_COLORS } from "./RelationshipEdge";

function renderEditor(content: string) {
  return render(
    <SchemaDiagramEditor content={content} onContentChange={vi.fn()} layout={{}} onLayoutChange={vi.fn()} />,
  );
}

function tableNode(name: string) {
  return document.querySelector(`[data-testid="table-node-${name}"]`) as HTMLElement;
}

const RELATED_DBML =
  "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\n\nTable customers {\n  id integer [primary key]\n}\n\nTable unrelated {\n  id integer [primary key]\n}\n\nRef: orders.customer_id > customers.id\n";

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

describe("SchemaDiagramEditor hover highlight and click-to-jump", () => {
  it("hovering a table highlights its connected table and dims unrelated tables", () => {
    renderEditor(RELATED_DBML);
    fireEvent.mouseEnter(tableNode("orders"));

    expect(tableNode("customers").style.opacity).not.toBe("0.4");
    expect(tableNode("unrelated").style.opacity).toBe("0.4");
  });

  it("unhovering clears the highlight/dim state", () => {
    renderEditor(RELATED_DBML);
    fireEvent.mouseEnter(tableNode("orders"));
    fireEvent.mouseLeave(tableNode("orders"));

    expect(tableNode("unrelated").style.opacity).not.toBe("0.4");
    expect(tableNode("customers").style.opacity).not.toBe("0.4");
  });

  it("clicking a foreign-key field highlights the referenced table", () => {
    renderEditor(RELATED_DBML);
    fireEvent.click(within(tableNode("orders")).getByText("customer_id"));

    expect(tableNode("customers").style.border).toContain("rgb(37, 99, 235)");
  });

  it("clicking a non-FK field does nothing", () => {
    renderEditor(RELATED_DBML);
    fireEvent.click(within(tableNode("orders")).getByText("id"));

    expect(tableNode("customers").style.border).not.toContain("rgb(37, 99, 235)");
    expect(tableNode("orders").style.border).not.toContain("rgb(37, 99, 235)");
  });

  // Actually starting a drag goes through react-flow's d3-drag integration,
  // which needs real browser event/window plumbing jsdom doesn't provide
  // (dispatching so much as a mousedown on a node crashes d3-drag's nodrag
  // helper in jsdom regardless of this component's own code). That's
  // covered for real in e2e/relationships.spec.ts instead.
});

describe("relationship type colors", () => {
  it("assigns a distinct color to each relationship type", () => {
    const colors = Object.values(RELATIONSHIP_TYPE_COLORS);
    expect(colors).toHaveLength(3);
    expect(new Set(colors).size).toBe(3);
  });
});
