import { describe, expect, it } from "vitest";
import { POST as fromSql } from "./from-sql/route";
import { POST as toSql } from "./to-sql/route";

function postJson(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CREATE_USERS_SQL =
  "CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(255));";

describe("POST /api/internal/dbml/from-sql", () => {
  it("returns 200 with { dbml } for valid input", async () => {
    const res = await fromSql(
      postJson("http://localhost/api/internal/dbml/from-sql", {
        sql: CREATE_USERS_SQL,
        dialect: "postgres",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dbml).toContain("users");
  });

  it("returns 400 with an error field for malformed SQL", async () => {
    const res = await fromSql(
      postJson("http://localhost/api/internal/dbml/from-sql", {
        sql: "CREATE TABLE users (id INT PRIMARY",
        dialect: "postgres",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTypeOf("string");
  });

  it("returns 400 when a required field is missing", async () => {
    const res = await fromSql(
      postJson("http://localhost/api/internal/dbml/from-sql", { sql: CREATE_USERS_SQL }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTypeOf("string");
  });

  // Next.js's route dispatcher returns 405 Method Not Allowed for any HTTP
  // method the route file doesn't export (see docs/01-app/.../route.md,
  // "Supported HTTP Methods"). This route only exports POST.
  it("only implements POST, so Next.js dispatches 405 for other methods", async () => {
    const routeModule: Record<string, unknown> = await import("./from-sql/route");
    expect(routeModule.POST).toBeTypeOf("function");
    expect(routeModule.GET).toBeUndefined();
  });
});

describe("POST /api/internal/dbml/to-sql", () => {
  it("returns 200 with { sql } for valid input", async () => {
    const res = await toSql(
      postJson("http://localhost/api/internal/dbml/to-sql", {
        dbml: 'Table users {\n  id int [pk]\n  name varchar\n}',
        dialect: "postgres",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sql.toUpperCase()).toContain("CREATE TABLE");
  });

  it("returns 400 with an error field for malformed DBML", async () => {
    const res = await toSql(
      postJson("http://localhost/api/internal/dbml/to-sql", {
        dbml: "Table users {",
        dialect: "postgres",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTypeOf("string");
  });

  it("returns 400 when a required field is missing", async () => {
    const res = await toSql(
      postJson("http://localhost/api/internal/dbml/to-sql", { dialect: "postgres" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTypeOf("string");
  });

  it("only implements POST, so Next.js dispatches 405 for other methods", async () => {
    const routeModule: Record<string, unknown> = await import("./to-sql/route");
    expect(routeModule.POST).toBeTypeOf("function");
    expect(routeModule.GET).toBeUndefined();
  });
});
