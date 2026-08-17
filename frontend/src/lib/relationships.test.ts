import { describe, expect, it } from "vitest";
import {
  buildRelationshipEdges,
  classifyRelationshipType,
  connectionsForTable,
  edgesForField,
  RelationshipRef,
  RelationshipTable,
} from "./relationships";

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

describe("classifyRelationshipType", () => {
  it("classifies 1/* as one-to-many", () => {
    expect(classifyRelationshipType({ sourceCardinality: "*", targetCardinality: "1" })).toBe(
      "one-to-many",
    );
    expect(classifyRelationshipType({ sourceCardinality: "1", targetCardinality: "*" })).toBe(
      "one-to-many",
    );
  });

  it("classifies 1/1 as one-to-one", () => {
    expect(classifyRelationshipType({ sourceCardinality: "1", targetCardinality: "1" })).toBe(
      "one-to-one",
    );
  });

  it("classifies */* as many-to-many", () => {
    expect(classifyRelationshipType({ sourceCardinality: "*", targetCardinality: "*" })).toBe(
      "many-to-many",
    );
  });
});

describe("connectionsForTable", () => {
  const invoices: RelationshipTable = { name: "invoices", fields: [{ name: "id" }, { name: "customer_id" }] };
  const edges = buildRelationshipEdges(
    [orders, customers, invoices],
    [
      ref("orders", "customer_id", "*", "customers", "id", "1"),
      ref("invoices", "customer_id", "*", "customers", "id", "1"),
    ],
  );

  it("returns exactly the tables reachable via edges touching the given table, not transitively", () => {
    const { tableNames } = connectionsForTable("customers", edges);
    expect(tableNames).toEqual(new Set(["orders", "invoices"]));

    const { tableNames: ordersConnections } = connectionsForTable("orders", edges);
    expect(ordersConnections).toEqual(new Set(["customers"]));
    expect(ordersConnections.has("invoices")).toBe(false);
  });

  it("returns an empty set for a table with no edges", () => {
    const { tableNames, edgeIds } = connectionsForTable("unrelated_table", edges);
    expect(tableNames.size).toBe(0);
    expect(edgeIds.size).toBe(0);
  });
});

describe("edgesForField", () => {
  it("returns all Refs a field participates in, not just the first", () => {
    const customersWithBilling: RelationshipTable = {
      name: "customers",
      fields: [{ name: "id" }, { name: "billing_id" }],
    };
    const billing: RelationshipTable = { name: "billing", fields: [{ name: "id" }] };
    const edges = buildRelationshipEdges(
      [orders, customersWithBilling, billing],
      [
        ref("orders", "customer_id", "*", "customers", "id", "1"),
        ref("customers", "id", "1", "billing", "id", "1"),
      ],
    );

    const targets = edgesForField("customers", "id", edges);
    expect(targets).toHaveLength(2);
  });

  it("returns an empty array for a field with no Refs", () => {
    const edges = buildRelationshipEdges(
      [orders, customers],
      [ref("orders", "customer_id", "*", "customers", "id", "1")],
    );
    expect(edgesForField("orders", "id", edges)).toEqual([]);
  });
});
