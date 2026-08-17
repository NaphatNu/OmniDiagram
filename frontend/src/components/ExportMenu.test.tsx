import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportMenu } from "./ExportMenu";
import { DbmlConversionError, dbmlToSql } from "@/lib/dbml";
import { downloadDataUrl, downloadText } from "@/lib/export";
import { Diagram } from "@/lib/types";

vi.mock("@/lib/dbml", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dbml")>("@/lib/dbml");
  return { ...actual, dbmlToSql: vi.fn() };
});

vi.mock("@/lib/export", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export")>("@/lib/export");
  return { ...actual, downloadText: vi.fn(), downloadDataUrl: vi.fn() };
});

const schemaDiagram: Diagram = {
  shareToken: "abc",
  title: "Orders / v2",
  kind: "SchemaDiagram",
  content: "Table orders {}",
  layout: {},
  updatedAt: "2026-08-01T00:00:00Z",
};

const genericDiagram: Diagram = {
  ...schemaDiagram,
  kind: "GenericDiagram",
  content: "flowchart TD\n  Start --> End\n",
};

function renderMenu(diagram: Diagram, isDirty = false) {
  const canvasRef = createRef<HTMLDivElement>();
  render(
    <div ref={canvasRef}>
      <ExportMenu diagram={diagram} content={diagram.content} isDirty={isDirty} canvasRef={canvasRef} />
    </div>,
  );
}

describe("ExportMenu", () => {
  beforeEach(() => {
    vi.mocked(dbmlToSql).mockReset();
    vi.mocked(downloadText).mockReset();
    vi.mocked(downloadDataUrl).mockReset();
  });

  it("offers no SQL formats for a GenericDiagram", () => {
    renderMenu(genericDiagram);
    fireEvent.click(screen.getByText("Export"));
    expect(screen.queryByText("SQL (PostgreSQL)")).not.toBeInTheDocument();
    expect(screen.getByText("Mermaid")).toBeInTheDocument();
  });

  it("offers DBML and every SQL dialect for a SchemaDiagram", () => {
    renderMenu(schemaDiagram);
    fireEvent.click(screen.getByText("Export"));
    expect(screen.getByText("DBML")).toBeInTheDocument();
    expect(screen.getByText("SQL (PostgreSQL)")).toBeInTheDocument();
    expect(screen.getByText("SQL (MySQL)")).toBeInTheDocument();
    expect(screen.getByText("SQL (SQL Server)")).toBeInTheDocument();
  });

  it("calls dbmlToSql with the dialect matching the chosen format", () => {
    vi.mocked(dbmlToSql).mockReturnValue("CREATE TABLE orders ();");
    renderMenu(schemaDiagram);
    fireEvent.click(screen.getByText("Export"));
    fireEvent.click(screen.getByText("SQL (PostgreSQL)"));

    expect(dbmlToSql).toHaveBeenCalledWith(schemaDiagram.content, "postgres");
    expect(downloadText).toHaveBeenCalledWith(
      "Orders-v2.postgres.sql",
      "CREATE TABLE orders ();",
      "text/plain",
    );
  });

  it("shows an error and does not download when SQL conversion fails", () => {
    vi.mocked(dbmlToSql).mockImplementation(() => {
      throw new DbmlConversionError("Parse error: invalid input");
    });
    renderMenu(schemaDiagram);
    fireEvent.click(screen.getByText("Export"));
    fireEvent.click(screen.getByText("SQL (PostgreSQL)"));

    expect(screen.getByText("Parse error: invalid input")).toBeInTheDocument();
    expect(downloadText).not.toHaveBeenCalled();
  });

  it("downloads DBML straight from the buffer with no conversion", () => {
    renderMenu(schemaDiagram);
    fireEvent.click(screen.getByText("Export"));
    fireEvent.click(screen.getByText("DBML"));

    expect(dbmlToSql).not.toHaveBeenCalled();
    expect(downloadText).toHaveBeenCalledWith("Orders-v2.dbml", schemaDiagram.content, "text/plain");
  });

  it("notes that unsaved changes are being exported when the buffer is dirty", () => {
    renderMenu(schemaDiagram, true);
    fireEvent.click(screen.getByText("Export"));
    expect(screen.getByText("Exporting unsaved changes")).toBeInTheDocument();
  });
});
