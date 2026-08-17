import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewDiagramButton } from "./NewDiagramButton";
import { createDiagram } from "@/lib/api";
import { Diagram } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/lib/api", () => ({
  createDiagram: vi.fn(),
}));

const created: Diagram = {
  shareToken: "abc",
  title: "Untitled diagram",
  kind: "SchemaDiagram",
  content: "",
  layout: {},
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("NewDiagramButton", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(createDiagram).mockReset();
  });

  it("creates a SchemaDiagram and navigates to its shareToken", async () => {
    vi.mocked(createDiagram).mockResolvedValue(created);

    render(<NewDiagramButton />);
    fireEvent.click(screen.getByText("New Diagram"));
    fireEvent.click(screen.getByText("SchemaDiagram"));

    expect(createDiagram).toHaveBeenCalledWith("SchemaDiagram");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/d/abc"));
  });

  it("disables the button while a create request is in flight", async () => {
    let resolve!: (value: Diagram) => void;
    vi.mocked(createDiagram).mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    render(<NewDiagramButton />);
    fireEvent.click(screen.getByText("New Diagram"));
    fireEvent.click(screen.getByText("SchemaDiagram"));

    expect(screen.getByText("New Diagram")).toBeDisabled();

    resolve(created);
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
