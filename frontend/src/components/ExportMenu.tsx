"use client";

import { RefObject, useState } from "react";
import { toPng, toSvg } from "html-to-image";
import { DbmlConversionError } from "@/lib/dbml";
import {
  downloadDataUrl,
  downloadText,
  ExportFormat,
  exportFormatsFor,
  filenameFor,
  isTextFormat,
  textContentForFormat,
} from "@/lib/export";
import { Diagram } from "@/lib/types";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  dbml: "DBML",
  mermaid: "Mermaid",
  "sql-postgres": "SQL (PostgreSQL)",
  "sql-mysql": "SQL (MySQL)",
  "sql-mssql": "SQL (SQL Server)",
  svg: "SVG image",
  png: "PNG image",
};

export function ExportMenu({
  diagram,
  content,
  isDirty,
  canvasRef,
}: {
  diagram: Diagram;
  content: string;
  isDirty: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: ExportFormat) {
    setError(null);

    if (isTextFormat(format)) {
      try {
        const text = textContentForFormat(format, content);
        downloadText(filenameFor(diagram.title, format), text, "text/plain");
        setOpen(false);
      } catch (err) {
        setError(err instanceof DbmlConversionError ? err.message : "Export failed");
      }
      return;
    }

    const node = canvasRef.current;
    if (!node) {
      setError("Nothing to export yet");
      return;
    }
    setExporting(true);
    try {
      const dataUrl = format === "svg" ? await toSvg(node) : await toPng(node);
      downloadDataUrl(filenameFor(diagram.title, format), dataUrl);
      setOpen(false);
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        Export
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-black/10 bg-background shadow-lg dark:border-white/10">
          {isDirty && (
            <p className="border-b border-black/10 px-3 py-2 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              Exporting unsaved changes
            </p>
          )}
          {exportFormatsFor(diagram.kind).map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exporting}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
            >
              {FORMAT_LABELS[format]}
            </button>
          ))}
          {error && (
            <p className="border-t border-black/10 px-3 py-2 text-xs text-red-600 dark:border-white/10 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
