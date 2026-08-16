"use client";

import { useState } from "react";
import { DiagramKind } from "@/lib/types";

export function NewDiagramButton() {
  const [open, setOpen] = useState(false);

  function createDiagram(kind: DiagramKind) {
    // TODO: POST /api/diagrams { kind }, then route to /d/[shareToken]
    setOpen(false);
    window.alert(`Creating a new ${kind}... (not wired to the backend yet)`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
      >
        New Diagram
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-black/10 bg-background shadow-lg dark:border-white/10">
          <button
            onClick={() => createDiagram("SchemaDiagram")}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            SchemaDiagram
          </button>
          <button
            onClick={() => createDiagram("GenericDiagram")}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            GenericDiagram
          </button>
        </div>
      )}
    </div>
  );
}
