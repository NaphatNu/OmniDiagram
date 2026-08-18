"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteDiagram, updateDiagram } from "@/lib/api";
import { formatUpdatedAt } from "@/lib/format";
import { DiagramSummary } from "@/lib/types";
import { KindBadge } from "./KindBadge";

const DEFAULT_TITLE = "Untitled diagram";

export function DiagramRow({
  diagram,
  onDeleted,
  onRenamed,
}: {
  diagram: DiagramSummary;
  onDeleted: () => void;
  onRenamed: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(diagram.title);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${diagram.title}"? This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    setError(false);
    try {
      await deleteDiagram(diagram.shareToken);
      onDeleted();
    } catch {
      setError(true);
      setDeleting(false);
    }
  }

  function startEditing() {
    setTitle(diagram.title);
    setRenameError(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    setTitle(diagram.title);
    setIsEditing(false);
  }

  async function commitRename() {
    const nextTitle = title.trim() === "" ? DEFAULT_TITLE : title.trim();
    if (nextTitle === diagram.title) {
      setIsEditing(false);
      return;
    }
    setRenaming(true);
    setRenameError(false);
    try {
      await updateDiagram(diagram.shareToken, { title: nextTitle });
      setIsEditing(false);
      onRenamed();
    } catch {
      setRenameError(true);
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div
      data-testid={`diagram-row-${diagram.shareToken}`}
      className="flex items-center justify-between border-b border-black/5 px-4 py-3 last:border-0 dark:border-white/5"
    >
      {isEditing ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") cancelEditing();
            }}
            disabled={renaming}
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm font-medium outline-none dark:border-white/10"
          />
          <KindBadge kind={diagram.kind} />
        </div>
      ) : (
        <Link
          href={`/share/${diagram.shareToken}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="truncate text-sm font-medium">{diagram.title}</span>
          <KindBadge kind={diagram.kind} />
        </Link>
      )}
      <div className="flex shrink-0 items-center gap-4">
        {renameError && (
          <span className="text-xs text-red-600 dark:text-red-400">Rename failed</span>
        )}
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">Delete failed</span>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatUpdatedAt(diagram.updatedAt)}
        </span>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="text-xs font-medium hover:underline"
          >
            Rename
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
