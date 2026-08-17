"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUpdatedAt } from "@/lib/format";
import { DiagramSummary } from "@/lib/types";
import { KindBadge } from "./KindBadge";

export function DiagramRow({ diagram }: { diagram: DiagramSummary }) {
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function handleDelete() {
    if (!window.confirm(`Delete "${diagram.title}"? This can't be undone.`)) {
      return;
    }
    // TODO: DELETE /api/diagrams/{id}
    setDeleted(true);
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
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatUpdatedAt(diagram.updatedAt)}
        </span>
        <button
          onClick={handleDelete}
          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
