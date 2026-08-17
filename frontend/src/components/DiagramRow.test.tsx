import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiagramRow } from "./DiagramRow";
import { deleteDiagram } from "@/lib/api";
import { DiagramSummary } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  deleteDiagram: vi.fn(),
}));

const diagram: DiagramSummary = {
  shareToken: "abc",
  title: "Orders schema",
  kind: "SchemaDiagram",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("DiagramRow", () => {
  let onDeleted: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(deleteDiagram).mockReset();
    onDeleted = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call deleteDiagram when the confirm dialog is dismissed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<DiagramRow diagram={diagram} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText("Delete"));

    expect(deleteDiagram).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("calls deleteDiagram after confirmation and refreshes via onDeleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteDiagram).mockResolvedValue(undefined);

    render(<DiagramRow diagram={diagram} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText("Delete"));

    expect(deleteDiagram).toHaveBeenCalledWith("abc");
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it("leaves the row visible and shows an error when delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteDiagram).mockRejectedValue(new Error("boom"));

    render(<DiagramRow diagram={diagram} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => expect(screen.getByText("Delete failed")).toBeInTheDocument());
    expect(screen.getByText("Orders schema")).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("disables the delete button while the request is in flight", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolve!: () => void;
    vi.mocked(deleteDiagram).mockReturnValue(
      new Promise((res) => {
        resolve = () => res(undefined);
      }),
    );

    render(<DiagramRow diagram={diagram} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText("Delete"));

    expect(screen.getByText("Delete")).toBeDisabled();

    resolve();
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});
