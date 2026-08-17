"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, updateDiagram } from "@/lib/api";
import { layoutsEqual } from "@/lib/layout";
import { Diagram, DiagramPatch } from "@/lib/types";

export function useDiagramEditor(initial: Diagram) {
  const [diagram, setDiagram] = useState(initial);
  const [content, setContent] = useState(initial.content);
  const [layout, setLayout] = useState(initial.layout);
  const [lastSavedContent, setLastSavedContent] = useState(initial.content);
  const [lastSavedLayout, setLastSavedLayout] = useState(initial.layout);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const contentDirty = content !== lastSavedContent;
  const layoutDirty = !layoutsEqual(layout, lastSavedLayout);
  const isDirty = contentDirty || layoutDirty;

  const applyDiagram = useCallback((updated: Diagram) => {
    setLastSavedContent(updated.content);
    setLastSavedLayout(updated.layout);
    setDiagram(updated);
    setContent(updated.content);
    setLayout(updated.layout);
  }, []);

  const save = useCallback(async () => {
    if (savingRef.current || (!contentDirty && !layoutDirty)) {
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const patch: DiagramPatch = {};
      if (contentDirty) patch.content = content;
      if (layoutDirty) patch.layout = layout;
      const updated = await updateDiagram(diagram.shareToken, patch);
      applyDiagram(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [content, contentDirty, layout, layoutDirty, diagram.shareToken, applyDiagram]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return {
    diagram,
    content,
    setContent,
    layout,
    setLayout,
    isDirty,
    isSaving,
    error,
    save,
    applyDiagram,
  };
}
