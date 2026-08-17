import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagramEditor } from "./useDiagramEditor";
import { updateDiagram } from "@/lib/api";
import { Diagram } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  updateDiagram: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const initial: Diagram = {
  shareToken: "abc",
  title: "Orders",
  kind: "SchemaDiagram",
  content: "Table orders {}",
  layout: {},
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("useDiagramEditor", () => {
  beforeEach(() => {
    vi.mocked(updateDiagram).mockReset();
  });

  it("starts clean with Save effectively disabled (isDirty false)", () => {
    const { result } = renderHook(() => useDiagramEditor(initial));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.content).toBe(initial.content);
  });

  it("marks dirty when the content changes", () => {
    const { result } = renderHook(() => useDiagramEditor(initial));
    act(() => result.current.setContent("Table orders { id int }"));
    expect(result.current.isDirty).toBe(true);
  });

  it("marks clean again when hand-reverted to the last-saved value", () => {
    const { result } = renderHook(() => useDiagramEditor(initial));
    act(() => result.current.setContent("changed"));
    act(() => result.current.setContent(initial.content));
    expect(result.current.isDirty).toBe(false);
  });

  it("clears the dirty state after a successful save", async () => {
    vi.mocked(updateDiagram).mockResolvedValue({ ...initial, content: "new content" });
    const { result } = renderHook(() => useDiagramEditor(initial));
    act(() => result.current.setContent("new content"));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("keeps the dirty state, keeps the content, and shows the error on a failed save", async () => {
    vi.mocked(updateDiagram).mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useDiagramEditor(initial));
    act(() => result.current.setContent("new content"));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.content).toBe("new content");
    expect(result.current.error).toBeTruthy();
  });

  it("does not send a second save while one is already in flight", async () => {
    let resolve!: (value: Diagram) => void;
    vi.mocked(updateDiagram).mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { result } = renderHook(() => useDiagramEditor(initial));
    act(() => result.current.setContent("new content"));

    act(() => {
      result.current.save();
      result.current.save();
    });

    expect(updateDiagram).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve({ ...initial, content: "new content" });
    });
  });

  it("sends only the changed fields", async () => {
    vi.mocked(updateDiagram).mockResolvedValue({ ...initial, content: "new content" });
    const { result } = renderHook(() => useDiagramEditor(initial));
    act(() => result.current.setContent("new content"));

    await act(async () => {
      await result.current.save();
    });

    expect(updateDiagram).toHaveBeenCalledWith("abc", { content: "new content" });
  });
});
