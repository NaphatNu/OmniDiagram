import { describe, expect, it } from "vitest";
import {
  exportFormatsFor,
  filenameFor,
  isTextFormat,
  sanitizeFilenameBase,
  textContentForFormat,
} from "./export";
import { DbmlConversionError } from "./dbml";

const DBML = "Table users {\n  id integer [primary key]\n  name varchar\n}\n";

describe("sanitizeFilenameBase / filenameFor", () => {
  it("keeps a simple title as-is", () => {
    expect(sanitizeFilenameBase("Orders")).toBe("Orders");
  });

  it("replaces slashes and spaces with a safe separator", () => {
    expect(sanitizeFilenameBase("Orders / Customers v2")).toBe("Orders-Customers-v2");
  });

  it("falls back to a default name for an empty or fully-unsafe title", () => {
    expect(sanitizeFilenameBase("   ")).toBe("diagram");
    expect(sanitizeFilenameBase("///")).toBe("diagram");
  });

  it("derives the filename from title and format extension", () => {
    expect(filenameFor("Orders", "dbml")).toBe("Orders.dbml");
    expect(filenameFor("Orders", "sql-postgres")).toBe("Orders.postgres.sql");
    expect(filenameFor("Orders", "png")).toBe("Orders.png");
  });
});

describe("exportFormatsFor", () => {
  it("offers DBML and SQL dialects plus image formats for SchemaDiagram", () => {
    const formats = exportFormatsFor("SchemaDiagram");
    expect(formats).toContain("dbml");
    expect(formats).toContain("sql-postgres");
    expect(formats).toContain("sql-mysql");
    expect(formats).toContain("sql-mssql");
    expect(formats).toContain("svg");
    expect(formats).toContain("png");
    expect(formats).not.toContain("mermaid");
  });

  it("offers only Mermaid and image formats for GenericDiagram, no SQL", () => {
    const formats = exportFormatsFor("GenericDiagram");
    expect(formats).toEqual(["mermaid", "svg", "png"]);
  });
});

describe("isTextFormat", () => {
  it("treats svg and png as non-text, everything else as text", () => {
    expect(isTextFormat("svg")).toBe(false);
    expect(isTextFormat("png")).toBe(false);
    expect(isTextFormat("dbml")).toBe(true);
    expect(isTextFormat("sql-postgres")).toBe(true);
  });
});

describe("textContentForFormat", () => {
  it("returns the buffer as-is for dbml and mermaid", () => {
    expect(textContentForFormat("dbml", DBML)).toBe(DBML);
    expect(textContentForFormat("mermaid", "flowchart TD\n")).toBe("flowchart TD\n");
  });

  it("calls through to dbmlToSql with the dialect matching the format", () => {
    const sql = textContentForFormat("sql-postgres", DBML);
    expect(sql.toUpperCase()).toContain("CREATE TABLE");
  });

  it("throws DbmlConversionError instead of returning empty output for invalid DBML", () => {
    expect(() => textContentForFormat("sql-postgres", "not dbml {{{")).toThrow(
      DbmlConversionError,
    );
  });
});
