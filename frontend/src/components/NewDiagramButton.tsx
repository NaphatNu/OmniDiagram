"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDiagram } from "@/lib/api";
import { DiagramKind } from "@/lib/types";

export function NewDiagramButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate(kind: DiagramKind) {
    setOpen(false);
    setCreating(true);
    try {
      const diagram = await createDiagram(kind);
      router.push(`/d/${diagram.shareToken}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={creating}
        className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        New Diagram
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-black/10 bg-background shadow-lg dark:border-white/10">
          <button
            onClick={() => handleCreate("SchemaDiagram")}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            SchemaDiagram
          </button>
          <button
            onClick={() => handleCreate("GenericDiagram")}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            GenericDiagram
          </button>
        </div>
      )}
    </div>
  );
}
