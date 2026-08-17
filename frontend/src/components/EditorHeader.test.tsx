import { render, screen } from "@testing-library/react";
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

describe("EditorHeader", () => {
  it("disables Save and shows Saved when clean", () => {
    render(
      <EditorHeader diagram={diagram} isDirty={false} isSaving={false} error={null} onSave={vi.fn()} />,
    );
    expect(screen.getByText("Save")).toBeDisabled();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("enables Save and shows Unsaved changes when dirty", () => {
    render(
      <EditorHeader diagram={diagram} isDirty={true} isSaving={false} error={null} onSave={vi.fn()} />,
    );
    expect(screen.getByText("Save")).not.toBeDisabled();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("disables Save while a save is in flight", () => {
    render(
      <EditorHeader diagram={diagram} isDirty={true} isSaving={true} error={null} onSave={vi.fn()} />,
    );
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("shows the error message instead of the dirty indicator when present", () => {
    render(
      <EditorHeader
        diagram={diagram}
        isDirty={true}
        isSaving={false}
        error="Failed to save"
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });
});
