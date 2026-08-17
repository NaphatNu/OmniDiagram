import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./page";
import { listDiagrams } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  listDiagrams: vi.fn(),
  deleteDiagram: vi.fn(),
  createDiagram: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(listDiagrams).mockReset();
  });

  it("renders one row per returned diagram, with title, kind badge, and formatted timestamp", async () => {
    vi.mocked(listDiagrams).mockResolvedValue([
      {
        shareToken: "a",
        title: "Orders schema",
        kind: "SchemaDiagram",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ]);

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText("Orders schema")).toBeInTheDocument());
    expect(screen.getByText("SchemaDiagram")).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2026-08-01T00:00:00Z").toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })),
    ).toBeInTheDocument();
  });

  it("renders the empty state for an empty list", async () => {
    vi.mocked(listDiagrams).mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() =>
      expect(
        screen.getByText("No diagrams yet. Create one to get started."),
      ).toBeInTheDocument(),
    );
  });

  it("renders an error message when the fetch rejects", async () => {
    vi.mocked(listDiagrams).mockRejectedValue(new Error("network down"));

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText("Failed to load diagrams.")).toBeInTheDocument());
  });
});
