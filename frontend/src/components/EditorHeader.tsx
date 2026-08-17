"use client";

import { RefObject, useState } from "react";
import { Diagram } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { ExportMenu } from "./ExportMenu";
import { ImportDialog } from "./ImportDialog";
import { KindBadge } from "./KindBadge";

export function EditorHeader({
  diagram,
  content,
  isDirty,
  isSaving,
  error,
  onSave,
  isHistoryOpen,
  onToggleHistory,
  canvasRef,
  onImport,
}: {
  diagram: Diagram;
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  onSave: () => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  canvasRef: RefObject<HTMLDivElement | null>;
  onImport: (dbml: string) => void;
}) {
  const [importOpen, setImportOpen] = useState(false);
  return (
    <AppHeader
      onNavigateAway={(event) => {
        if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) {
          event.preventDefault();
        }
      }}
    >
      <span className="text-sm font-medium">{diagram.title}</span>
      <KindBadge kind={diagram.kind} />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {isDirty ? "Unsaved changes" : "Saved"}
        </span>
      )}
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
      >
        Save
      </button>
      <button
        onClick={onToggleHistory}
        aria-pressed={isHistoryOpen}
        className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        History
      </button>
      {diagram.kind === "SchemaDiagram" && (
        <button
          onClick={() => setImportOpen(true)}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          Import
        </button>
      )}
      <ExportMenu diagram={diagram} content={content} isDirty={isDirty} canvasRef={canvasRef} />
      <button className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        Copy link
      </button>
      {importOpen && (
        <ImportDialog onImport={onImport} onClose={() => setImportOpen(false)} />
      )}
    </AppHeader>
  );
}
