import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportDialog } from "./ImportDialog";
import { DbmlConversionError, sqlToDbml } from "@/lib/dbml";

vi.mock("@/lib/dbml", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dbml")>("@/lib/dbml");
  return { ...actual, sqlToDbml: vi.fn() };
});

function renderDialog() {
  const onImport = vi.fn();
  const onClose = vi.fn();
  render(<ImportDialog onImport={onImport} onClose={onClose} />);
  return { onImport, onClose };
}

describe("ImportDialog", () => {
  beforeEach(() => {
    vi.mocked(sqlToDbml).mockReset();
  });

  it("converts pasted SQL via sqlToDbml and imports the result", () => {
    vi.mocked(sqlToDbml).mockReturnValue("Table users {\n  id integer\n}\n");
    const { onImport, onClose } = renderDialog();

    fireEvent.change(screen.getByPlaceholderText("Paste CREATE TABLE statements..."), {
      target: { value: "CREATE TABLE users (id INT);" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(sqlToDbml).toHaveBeenCalledWith("CREATE TABLE users (id INT);", "postgres");
    expect(onImport).toHaveBeenCalledWith("Table users {\n  id integer\n}\n");
    expect(onClose).toHaveBeenCalled();
  });

  it("imports pasted DBML as-is without calling sqlToDbml", () => {
    const { onImport, onClose } = renderDialog();

    fireEvent.click(screen.getByText("DBML"));
    fireEvent.change(screen.getByPlaceholderText("Paste DBML..."), {
      target: { value: "Table users {\n  id integer\n}\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(sqlToDbml).not.toHaveBeenCalled();
    expect(onImport).toHaveBeenCalledWith("Table users {\n  id integer\n}\n");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error and leaves the buffer untouched when SQL fails to parse", () => {
    vi.mocked(sqlToDbml).mockImplementation(() => {
      throw new DbmlConversionError("Parse error: invalid input");
    });
    const { onImport, onClose } = renderDialog();

    fireEvent.change(screen.getByPlaceholderText("Paste CREATE TABLE statements..."), {
      target: { value: "not sql" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(screen.getByText("Parse error: invalid input")).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("requires some input before importing", () => {
    const { onImport } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByText("Paste or choose a .sql file first")).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });
});
