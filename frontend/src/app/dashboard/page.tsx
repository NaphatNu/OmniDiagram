"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DiagramRow } from "@/components/DiagramRow";
import { NewDiagramButton } from "@/components/NewDiagramButton";
import { listDiagrams } from "@/lib/api";
import { DiagramSummary } from "@/lib/types";

export default function Dashboard() {
  const [diagrams, setDiagrams] = useState<DiagramSummary[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    listDiagrams()
      .then((data) => {
        setDiagrams(data);
        setError(false);
      })
      .catch(() => {
        setError(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <NewDiagramButton />
      </AppHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load diagrams.
          </p>
        ) : diagrams === null ? null : diagrams.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No diagrams yet. Create one to get started.
          </p>
        ) : (
          <div className="rounded-lg border border-black/10 dark:border-white/10">
            {diagrams.map((diagram) => (
              <DiagramRow key={diagram.shareToken} diagram={diagram} onDeleted={load} onRenamed={load} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
