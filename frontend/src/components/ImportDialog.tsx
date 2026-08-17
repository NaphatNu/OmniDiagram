"use client";

import { ChangeEvent, useState } from "react";
import { DbmlConversionError, sqlToDbml } from "@/lib/dbml";

type Source = "sql" | "dbml";

export function ImportDialog({
  onImport,
  onClose,
}: {
  onImport: (dbml: string) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState<Source>("sql");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    file.text().then(setText);
  }

  function handleImport() {
    setError(null);
    if (!text.trim()) {
      setError(source === "sql" ? "Paste or choose a .sql file first" : "Paste or choose a .dbml file first");
      return;
    }
    if (source === "dbml") {
      onImport(text);
      onClose();
      return;
    }
    try {
      const dbml = sqlToDbml(text, "postgres");
      onImport(dbml);
      onClose();
    } catch (err) {
      setError(err instanceof DbmlConversionError ? err.message : "Import failed");
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import"
        className="w-full max-w-lg rounded-lg border border-black/10 bg-background p-4 shadow-lg dark:border-white/10"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Import</span>
          <button
            onClick={onClose}
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setSource("sql")}
            aria-pressed={source === "sql"}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              source === "sql"
                ? "border-black/30 dark:border-white/30"
                : "border-black/10 dark:border-white/10"
            }`}
          >
            SQL
          </button>
          <button
            onClick={() => setSource("dbml")}
            aria-pressed={source === "dbml"}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              source === "dbml"
                ? "border-black/30 dark:border-white/30"
                : "border-black/10 dark:border-white/10"
            }`}
          >
            DBML
          </button>
        </div>

        <input
          type="file"
          accept={source === "sql" ? ".sql" : ".dbml"}
          onChange={handleFile}
          className="mt-3 block text-sm"
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={source === "sql" ? "Paste CREATE TABLE statements..." : "Paste DBML..."}
          spellCheck={false}
          className="mt-3 h-48 w-full resize-none rounded-md border border-black/10 bg-transparent p-2 font-mono text-sm outline-none dark:border-white/10"
        />

        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleImport}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
