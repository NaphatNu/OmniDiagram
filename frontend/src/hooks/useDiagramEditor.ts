"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, updateDiagram } from "@/lib/api";
import { Diagram } from "@/lib/types";

export function useDiagramEditor(initial: Diagram) {
  const [diagram, setDiagram] = useState(initial);
  const [content, setContent] = useState(initial.content);
  const [lastSavedContent, setLastSavedContent] = useState(initial.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const isDirty = content !== lastSavedContent;

  const save = useCallback(async () => {
    if (savingRef.current || content === lastSavedContent) {
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateDiagram(diagram.shareToken, { content });
      setLastSavedContent(updated.content);
      setDiagram(updated);
      setContent(updated.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [content, lastSavedContent, diagram.shareToken]);

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

  return { diagram, content, setContent, isDirty, isSaving, error, save };
}
