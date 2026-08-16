import { describe, expect, it } from "vitest";
import { formatUpdatedAt } from "./format";

describe("formatUpdatedAt", () => {
  it("formats a known ISO string without throwing", () => {
    const result = formatUpdatedAt("2026-03-05T12:00:00.000Z");
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("2026");
  });
});
