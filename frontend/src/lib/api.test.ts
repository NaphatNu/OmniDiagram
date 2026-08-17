import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createDiagram,
  deleteDiagram,
  getDiagram,
  listDiagrams,
  updateDiagram,
} from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listDiagrams calls GET /api/admin/diagrams and returns parsed data", async () => {
    const summaries = [
      { shareToken: "a", title: "A", kind: "SchemaDiagram", updatedAt: "2026-08-01T00:00:00Z" },
    ];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(summaries));

    const result = await listDiagrams();

    expect(fetch).toHaveBeenCalledWith("/api/admin/diagrams", expect.anything());
    expect(result).toEqual(summaries);
  });

  it("createDiagram calls POST /api/admin/diagrams with kind and title", async () => {
    const diagram = {
      shareToken: "a",
      title: "A",
      kind: "SchemaDiagram",
      content: "",
      layout: {},
      updatedAt: "2026-08-01T00:00:00Z",
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(diagram, 201));

    const result = await createDiagram("SchemaDiagram", "A");

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/diagrams",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ kind: "SchemaDiagram", title: "A" }),
      }),
    );
    expect(result).toEqual(diagram);
  });

  it("deleteDiagram calls DELETE /api/admin/diagrams/{shareToken}", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await deleteDiagram("abc");

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/diagrams/abc",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("getDiagram calls GET /api/diagrams/{shareToken}", async () => {
    const diagram = {
      shareToken: "abc",
      title: "A",
      kind: "SchemaDiagram",
      content: "Table t {}",
      layout: {},
      updatedAt: "2026-08-01T00:00:00Z",
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(diagram));

    const result = await getDiagram("abc");

    expect(fetch).toHaveBeenCalledWith("/api/diagrams/abc", expect.anything());
    expect(result).toEqual(diagram);
  });

  it("updateDiagram sends only the provided fields", async () => {
    const diagram = {
      shareToken: "abc",
      title: "New title",
      kind: "SchemaDiagram",
      content: "Table t {}",
      layout: {},
      updatedAt: "2026-08-01T00:00:00Z",
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(diagram));

    await updateDiagram("abc", { title: "New title" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/diagrams/abc",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ title: "New title" }),
      }),
    );
  });

  it("throws an ApiError with status 404 on a not-found response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Diagram not found" }, 404));

    await expect(getDiagram("missing")).rejects.toMatchObject(
      new ApiError(404, "Diagram not found"),
    );
  });

  it("throws an ApiError carrying the server's JSON error message on 500", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Database is down" }, 500));

    await expect(listDiagrams()).rejects.toMatchObject(new ApiError(500, "Database is down"));
  });

  it("throws a usable ApiError when a 500 body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>Internal Server Error</html>", {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(listDiagrams()).rejects.toMatchObject(
      new ApiError(500, "Internal Server Error"),
    );
  });
});
