"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, updateDiagram } from "@/lib/api";
import { layoutsEqual } from "@/lib/layout";
import { Diagram, DiagramPatch } from "@/lib/types";

const DEFAULT_TITLE = "Untitled diagram";

export function useDiagramEditor(initial: Diagram) {
  const [diagram, setDiagram] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [layout, setLayout] = useState(initial.layout);
  const [lastSavedTitle, setLastSavedTitle] = useState(initial.title);
  const [lastSavedContent, setLastSavedContent] = useState(initial.content);
  const [lastSavedLayout, setLastSavedLayout] = useState(initial.layout);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const titleDirty = title !== lastSavedTitle;
  const contentDirty = content !== lastSavedContent;
  const layoutDirty = !layoutsEqual(layout, lastSavedLayout);
  const isDirty = titleDirty || contentDirty || layoutDirty;

  const applyDiagram = useCallback((updated: Diagram) => {
    setLastSavedTitle(updated.title);
    setLastSavedContent(updated.content);
    setLastSavedLayout(updated.layout);
    setDiagram(updated);
    setTitle(updated.title);
    setContent(updated.content);
    setLayout(updated.layout);
  }, []);

  const save = useCallback(async () => {
    if (savingRef.current || (!titleDirty && !contentDirty && !layoutDirty)) {
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const patch: DiagramPatch = {};
      if (titleDirty) patch.title = title.trim() === "" ? DEFAULT_TITLE : title.trim();
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
  }, [title, titleDirty, content, contentDirty, layout, layoutDirty, diagram.shareToken, applyDiagram]);

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
    title,
    setTitle,
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
