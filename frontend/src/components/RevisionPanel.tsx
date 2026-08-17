"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, listRevisions, revertToRevision } from "@/lib/api";
import { formatUpdatedAt } from "@/lib/format";
import { Diagram, RevisionSummary } from "@/lib/types";

export function RevisionPanel({
  shareToken,
  isDirty,
  refreshToken,
  onClose,
  onReverted,
}: {
  shareToken: string;
  isDirty: boolean;
  refreshToken: string;
  onClose: () => void;
  onReverted: (diagram: Diagram) => void;
}) {
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const load = useCallback(() => {
    listRevisions(shareToken)
      .then((data) => {
        setRevisions(data);
        setError(null);
      })
      .catch(() => {
        setError("Failed to load revision history");
      });
  }, [shareToken]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  async function handleRevert(revision: RevisionSummary) {
    const timestamp = formatUpdatedAt(revision.createdAt);
    const message = isDirty
      ? `Restore the version from ${timestamp}? Your unsaved changes will be lost.`
      : `Restore the version from ${timestamp}?`;
    if (!window.confirm(message)) {
      return;
    }

    setRevertingId(revision.id);
    setError(null);
    try {
      const restored = await revertToRevision(shareToken, revision.id);
      onReverted(restored);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to restore that version");
    } finally {
      setRevertingId(null);
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-black/10 dark:border-white/10">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/10 px-4 dark:border-white/10">
        <span className="text-sm font-medium">History</span>
        <button
          onClick={onClose}
          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {error && (
          <p className="px-4 py-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        {revisions === null ? (
          <p className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : revisions.length === 0 ? (
          <p className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
            No previous versions yet
          </p>
        ) : (
          <ul>
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className="border-b border-black/5 px-4 py-3 last:border-0 dark:border-white/5"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatUpdatedAt(revision.createdAt)}
                </p>
                <p className="mt-1 truncate text-sm">{revision.contentPreview}</p>
                <button
                  onClick={() => handleRevert(revision)}
                  disabled={revertingId === revision.id}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
