import { describe, expect, it } from "vitest";
import { layoutsEqual, mergeLayout } from "./layout";
import { Position } from "./types";

describe("mergeLayout", () => {
  it("applies stored positions to matching tables", () => {
    const merged = mergeLayout(["orders"], { orders: { x: 100, y: 50 } });
    expect(merged.orders).toEqual({ x: 100, y: 50 });
  });

  it("gives a table absent from layout a grid position, and two such tables do not overlap", () => {
    const merged = mergeLayout(["orders", "customers"], {});
    expect(merged.orders).not.toEqual(merged.customers);
  });

  it("drops a layout key with no matching table", () => {
    const merged = mergeLayout(["orders"], { orders: { x: 1, y: 2 }, ghost: { x: 9, y: 9 } });
    expect(merged).not.toHaveProperty("ghost");
    expect(Object.keys(merged)).toEqual(["orders"]);
  });

  it("produces the same grid as current behavior for an empty layout", () => {
    const merged = mergeLayout(["a", "b", "c", "d", "e"], {});
    expect(merged.a).toEqual({ x: 0, y: 0 });
    expect(merged.b).toEqual({ x: 260, y: 0 });
    expect(merged.c).toEqual({ x: 520, y: 0 });
    expect(merged.d).toEqual({ x: 780, y: 0 });
    expect(merged.e).toEqual({ x: 0, y: 220 });
  });

  it("falls back to a grid position for a malformed entry instead of producing NaN", () => {
    const merged = mergeLayout(["orders"], {
      orders: { x: "oops", y: 1 } as unknown as Position,
    });
    expect(Number.isFinite(merged.orders.x)).toBe(true);
    expect(Number.isFinite(merged.orders.y)).toBe(true);
  });

  it("falls back to a grid position when x or y is missing", () => {
    const merged = mergeLayout(["orders"], { orders: { y: 1 } as unknown as Position });
    expect(Number.isFinite(merged.orders.x)).toBe(true);
    expect(Number.isFinite(merged.orders.y)).toBe(true);
  });
});

describe("layoutsEqual", () => {
  it("is true for two empty layouts", () => {
    expect(layoutsEqual({}, {})).toBe(true);
  });

  it("is true for layouts with the same keys and positions", () => {
    expect(layoutsEqual({ a: { x: 1, y: 2 } }, { a: { x: 1, y: 2 } })).toBe(true);
  });

  it("is false when a position differs", () => {
    expect(layoutsEqual({ a: { x: 1, y: 2 } }, { a: { x: 1, y: 3 } })).toBe(false);
  });

  it("is false when the key sets differ", () => {
    expect(layoutsEqual({ a: { x: 1, y: 2 } }, { b: { x: 1, y: 2 } })).toBe(false);
  });
});
