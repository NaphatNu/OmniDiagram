"use client";

import { Diagram } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { KindBadge } from "./KindBadge";

export function EditorHeader({
  diagram,
  isDirty,
  isSaving,
  error,
  onSave,
  isHistoryOpen,
  onToggleHistory,
}: {
  diagram: Diagram;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  onSave: () => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
}) {
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
      <button className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        Export
      </button>
      <button className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        Copy link
      </button>
    </AppHeader>
  );
}
