"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteDiagram } from "@/lib/api";
import { formatUpdatedAt } from "@/lib/format";
import { DiagramSummary } from "@/lib/types";
import { KindBadge } from "./KindBadge";

export function DiagramRow({
  diagram,
  onDeleted,
}: {
  diagram: DiagramSummary;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

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

  return (
    <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 last:border-0 dark:border-white/5">
      <Link
        href={`/d/${diagram.shareToken}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="truncate text-sm font-medium">{diagram.title}</span>
        <KindBadge kind={diagram.kind} />
      </Link>
      <div className="flex shrink-0 items-center gap-4">
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">Delete failed</span>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatUpdatedAt(diagram.updatedAt)}
        </span>
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
