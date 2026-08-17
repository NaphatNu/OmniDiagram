import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevisionPanel } from "./RevisionPanel";
import { listRevisions, revertToRevision } from "@/lib/api";
import { Diagram, RevisionSummary } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  listRevisions: vi.fn(),
  revertToRevision: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const revisions: RevisionSummary[] = [
  { id: "r2", createdAt: "2026-08-02T00:00:00Z", contentPreview: "Table orders { id int }" },
  { id: "r1", createdAt: "2026-08-01T00:00:00Z", contentPreview: "Table orders {}" },
];

const restoredDiagram: Diagram = {
  shareToken: "abc",
  title: "Orders",
  kind: "SchemaDiagram",
  content: "Table orders {}",
  layout: {},
  updatedAt: "2026-08-03T00:00:00Z",
};

function renderPanel(overrides: Partial<Parameters<typeof RevisionPanel>[0]> = {}) {
  const onClose = vi.fn();
  const onReverted = vi.fn();
  const utils = render(
    <RevisionPanel
      shareToken="abc"
      isDirty={false}
      refreshToken="v1"
      onClose={onClose}
      onReverted={onReverted}
      {...overrides}
    />,
  );
  return { ...utils, onClose, onReverted };
}

describe("RevisionPanel", () => {
  beforeEach(() => {
    vi.mocked(listRevisions).mockReset();
    vi.mocked(revertToRevision).mockReset();
    vi.spyOn(window, "confirm").mockReset();
  });

  it("renders entries newest-first with timestamps and previews", async () => {
    vi.mocked(listRevisions).mockResolvedValue(revisions);
    renderPanel();

    await waitFor(() => expect(screen.getAllByText("Restore")).toHaveLength(2));
    const previews = screen.getAllByText(/Table orders/);
    expect(previews[0]).toHaveTextContent("Table orders { id int }");
    expect(previews[1]).toHaveTextContent("Table orders {}");
  });

  it("renders the empty state for an empty history", async () => {
    vi.mocked(listRevisions).mockResolvedValue([]);
    renderPanel();

    expect(await screen.findByText("No previous versions yet")).toBeInTheDocument();
  });

  it("clicking revert asks for confirmation and calls revertToRevision only on confirm", async () => {
    vi.mocked(listRevisions).mockResolvedValue(revisions);
    vi.mocked(revertToRevision).mockResolvedValue(restoredDiagram);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPanel();

    const restoreButtons = await screen.findAllByText("Restore");
    fireEvent.click(restoreButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(revertToRevision).not.toHaveBeenCalled();
  });

  it("a successful revert refreshes the list and updates the editor content", async () => {
    vi.mocked(listRevisions)
      .mockResolvedValueOnce(revisions)
      .mockResolvedValueOnce([
        { id: "r3", createdAt: "2026-08-03T00:00:00Z", contentPreview: "Table orders { id int }" },
        ...revisions,
      ]);
    vi.mocked(revertToRevision).mockResolvedValue(restoredDiagram);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onReverted } = renderPanel();

    const restoreButtons = await screen.findAllByText("Restore");
    fireEvent.click(restoreButtons[1]);

    await waitFor(() => expect(onReverted).toHaveBeenCalledWith(restoredDiagram));
    expect(revertToRevision).toHaveBeenCalledWith("abc", "r1");
    await waitFor(() => expect(listRevisions).toHaveBeenCalledTimes(2));
  });

  it("a failed revert shows an error and leaves the content untouched", async () => {
    vi.mocked(listRevisions).mockResolvedValue(revisions);
    vi.mocked(revertToRevision).mockRejectedValue(new Error("boom"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onReverted } = renderPanel();

    const restoreButtons = await screen.findAllByText("Restore");
    fireEvent.click(restoreButtons[0]);

    expect(await screen.findByText("Failed to restore that version")).toBeInTheDocument();
    expect(onReverted).not.toHaveBeenCalled();
  });

  it("reloads the list when refreshToken changes, as happens after a save", async () => {
    vi.mocked(listRevisions).mockResolvedValue(revisions);
    const { rerender } = renderPanel({ refreshToken: "v1" });

    await waitFor(() => expect(listRevisions).toHaveBeenCalledTimes(1));

    rerender(
      <RevisionPanel
        shareToken="abc"
        isDirty={false}
        refreshToken="v2"
        onClose={vi.fn()}
        onReverted={vi.fn()}
      />,
    );

    await waitFor(() => expect(listRevisions).toHaveBeenCalledTimes(2));
  });
});
