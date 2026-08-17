import { describe, expect, it } from "vitest";
import { DbmlConversionError, dbmlToSql, sqlToDbml } from "./dbml";

const CREATE_USERS_SQL =
  "CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(255));";

describe("sqlToDbml", () => {
  it("converts a valid Postgres CREATE TABLE into DBML containing the table and columns", () => {
    const dbml = sqlToDbml(CREATE_USERS_SQL, "postgres");
    expect(dbml).toContain("users");
    expect(dbml).toContain("id");
    expect(dbml).toContain("name");
  });

  it("throws a translated error carrying line information for invalid SQL", () => {
    expect(() => sqlToDbml("CREATE TABLE users (id INT PRIMARY", "postgres")).toThrow(
      DbmlConversionError,
    );
    try {
      sqlToDbml("CREATE TABLE users (id INT PRIMARY", "postgres");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DbmlConversionError);
      expect((err as Error).message).toMatch(/line \d+/i);
    }
  });

  it("throws for an unknown dialect", () => {
    expect(() => sqlToDbml(CREATE_USERS_SQL, "sqlite")).toThrow(DbmlConversionError);
    expect(() => sqlToDbml(CREATE_USERS_SQL, "made-up")).toThrow(/Unknown dialect/);
  });

  it("throws rather than returning empty output for empty input", () => {
    expect(() => sqlToDbml("", "postgres")).toThrow(DbmlConversionError);
    expect(() => sqlToDbml("   ", "postgres")).toThrow(DbmlConversionError);
  });
});

describe("dbmlToSql", () => {
  it("converts DBML back to SQL", () => {
    const dbml = sqlToDbml(CREATE_USERS_SQL, "postgres");
    const sql = dbmlToSql(dbml, "postgres");
    expect(sql).toContain("users");
    expect(sql.toUpperCase()).toContain("CREATE TABLE");
  });

  it("round trips DBML -> SQL -> DBML preserving table and column names", () => {
    const dbml = sqlToDbml(CREATE_USERS_SQL, "postgres");
    const sql = dbmlToSql(dbml, "postgres");
    const roundTripped = sqlToDbml(sql, "postgres");
    expect(roundTripped).toContain("users");
    expect(roundTripped).toContain("id");
    expect(roundTripped).toContain("name");
  });

  it("produces non-empty, distinct SQL per export dialect for the same input", () => {
    const dbml = sqlToDbml(CREATE_USERS_SQL, "postgres");
    const outputs = ["postgres", "mysql", "mssql"].map((dialect) => dbmlToSql(dbml, dialect));
    for (const sql of outputs) {
      expect(sql.length).toBeGreaterThan(0);
    }
    expect(new Set(outputs).size).toBe(outputs.length);
  });

  it("throws a translated error for invalid DBML", () => {
    expect(() => dbmlToSql("Table users {", "postgres")).toThrow(DbmlConversionError);
    try {
      dbmlToSql("Table users {", "postgres");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DbmlConversionError);
    }
  });

  it("throws for an unknown dialect", () => {
    const dbml = sqlToDbml(CREATE_USERS_SQL, "postgres");
    expect(() => dbmlToSql(dbml, "sqlite")).toThrow(DbmlConversionError);
    expect(() => dbmlToSql(dbml, "made-up")).toThrow(/Unknown dialect/);
  });

  it("throws rather than returning empty output for empty input", () => {
    expect(() => dbmlToSql("", "postgres")).toThrow(DbmlConversionError);
    expect(() => dbmlToSql("   ", "postgres")).toThrow(DbmlConversionError);
  });
});
