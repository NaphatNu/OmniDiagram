import { describe, expect, it } from "vitest";
import { buildRelationshipEdges, RelationshipRef, RelationshipTable } from "./relationships";

const orders: RelationshipTable = {
  name: "orders",
  fields: [{ name: "id" }, { name: "customer_id" }, { name: "parent_order_id" }],
};
const customers: RelationshipTable = {
  name: "customers",
  fields: [{ name: "id" }],
};

function ref(
  sourceTable: string,
  sourceField: string,
  sourceRelation: string,
  targetTable: string,
  targetField: string,
  targetRelation: string,
): RelationshipRef {
  return {
    endpoints: [
      { tableName: sourceTable, fieldNames: [sourceField], relation: sourceRelation },
      { tableName: targetTable, fieldNames: [targetField], relation: targetRelation },
    ],
  };
}

describe("buildRelationshipEdges", () => {
  it("maps a one-to-many Ref to one edge with 1/* cardinality on the correct ends", () => {
    const edges = buildRelationshipEdges(
      [orders, customers],
      [ref("orders", "customer_id", "*", "customers", "id", "1")],
    );
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: "orders",
      sourceHandle: "customer_id",
      sourceCardinality: "*",
      target: "customers",
      targetHandle: "id",
      targetCardinality: "1",
      dangling: false,
      selfReferencing: false,
    });
  });

  it("maps a one-to-one Ref to 1/1 cardinality on both ends", () => {
    const edges = buildRelationshipEdges(
      [orders, customers],
      [ref("orders", "customer_id", "1", "customers", "id", "1")],
    );
    expect(edges[0].sourceCardinality).toBe("1");
    expect(edges[0].targetCardinality).toBe("1");
  });

  it("maps a many-to-many Ref to */* cardinality on both ends", () => {
    const edges = buildRelationshipEdges(
      [orders, customers],
      [ref("orders", "customer_id", "*", "customers", "id", "*")],
    );
    expect(edges[0].sourceCardinality).toBe("*");
    expect(edges[0].targetCardinality).toBe("*");
  });

  it("flags a Ref naming a table absent from the parsed tables as dangling", () => {
    const edges = buildRelationshipEdges(
      [orders],
      [ref("orders", "customer_id", "*", "customers", "id", "1")],
    );
    expect(edges[0].dangling).toBe(true);
    expect(edges[0].danglingReason).toContain("customers");
  });

  it("flags a Ref naming a field absent from an existing table as dangling", () => {
    const edges = buildRelationshipEdges(
      [orders, customers],
      [ref("orders", "nonexistent_id", "*", "customers", "id", "1")],
    );
    expect(edges[0].dangling).toBe(true);
    expect(edges[0].danglingReason).toContain("nonexistent_id");
  });

  it("flags a self-referencing Ref for self-loop rendering, not as dangling", () => {
    const edges = buildRelationshipEdges(
      [orders],
      [ref("orders", "parent_order_id", "*", "orders", "id", "1")],
    );
    expect(edges[0].selfReferencing).toBe(true);
    expect(edges[0].dangling).toBe(false);
  });

  it("produces no edges and no dangling flags for an empty refs list", () => {
    expect(buildRelationshipEdges([orders, customers], [])).toEqual([]);
  });

  it("keeps multiple Refs between the same two tables as distinct edges", () => {
    const edges = buildRelationshipEdges(
      [orders, customers],
      [
        ref("orders", "customer_id", "*", "customers", "id", "1"),
        ref("customers", "id", "1", "orders", "customer_id", "*"),
      ],
    );
    expect(edges).toHaveLength(2);
    expect(new Set(edges.map((e) => e.id)).size).toBe(2);
  });
});
