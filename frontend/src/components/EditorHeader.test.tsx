import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { EditorHeader } from "./EditorHeader";
import { Diagram } from "@/lib/types";

const diagram: Diagram = {
  shareToken: "abc",
  title: "Orders",
  kind: "SchemaDiagram",
  content: "Table orders {}",
  layout: {},
  updatedAt: "2026-08-01T00:00:00Z",
};

function renderHeader(overrides: Partial<Parameters<typeof EditorHeader>[0]> = {}) {
  const canvasRef = createRef<HTMLDivElement>();
  return render(
    <EditorHeader
      diagram={diagram}
      content={diagram.content}
      isDirty={false}
      isSaving={false}
      error={null}
      onSave={vi.fn()}
      isHistoryOpen={false}
      onToggleHistory={vi.fn()}
      canvasRef={canvasRef}
      onImport={vi.fn()}
      {...overrides}
    />,
  );
}

describe("EditorHeader", () => {
  it("disables Save and shows Saved when clean", () => {
    renderHeader({ isDirty: false });
    expect(screen.getByText("Save")).toBeDisabled();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("enables Save and shows Unsaved changes when dirty", () => {
    renderHeader({ isDirty: true });
    expect(screen.getByText("Save")).not.toBeDisabled();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("disables Save while a save is in flight", () => {
    renderHeader({ isDirty: true, isSaving: true });
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("shows the error message instead of the dirty indicator when present", () => {
    renderHeader({ isDirty: true, error: "Failed to save" });
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("calls onToggleHistory when the History button is clicked", () => {
    const onToggleHistory = vi.fn();
    renderHeader({ onToggleHistory });
    screen.getByText("History").click();
    expect(onToggleHistory).toHaveBeenCalledTimes(1);
  });

  it("shows Import for a SchemaDiagram", () => {
    renderHeader();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("hides Import for a GenericDiagram", () => {
    renderHeader({ diagram: { ...diagram, kind: "GenericDiagram" } });
    expect(screen.queryByText("Import")).not.toBeInTheDocument();
  });

  it("opens the import dialog from the Import button", () => {
    renderHeader();
    fireEvent.click(screen.getByText("Import"));
    expect(screen.getByPlaceholderText("Paste CREATE TABLE statements...")).toBeInTheDocument();
  });
});
