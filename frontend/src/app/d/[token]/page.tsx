"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { EditorHeader } from "@/components/EditorHeader";
import { SchemaDiagramEditor } from "@/components/SchemaDiagramEditor";
import { GenericDiagramEditor } from "@/components/GenericDiagramEditor";
import { useDiagramEditor } from "@/hooks/useDiagramEditor";
import { ApiError, getDiagram } from "@/lib/api";
import { Diagram } from "@/lib/types";

function Editor({ diagram }: { diagram: Diagram }) {
  const editor = useDiagramEditor(diagram);

  return (
    <div className="flex flex-1 flex-col">
      <EditorHeader
        diagram={editor.diagram}
        isDirty={editor.isDirty}
        isSaving={editor.isSaving}
        error={editor.error}
        onSave={editor.save}
      />
      {editor.diagram.kind === "SchemaDiagram" ? (
        <SchemaDiagramEditor content={editor.content} onContentChange={editor.setContent} />
      ) : (
        <GenericDiagramEditor content={editor.content} onContentChange={editor.setContent} />
      )}
    </div>
  );
}

export default function DiagramEditorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDiagram(token)
      .then((data) => {
        if (!cancelled) setDiagram(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setMissing(true);
        } else {
          setLoadError(err instanceof Error ? err : new Error("Failed to load diagram"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (missing) {
    notFound();
  }
  if (loadError) {
    throw loadError;
  }
  if (!diagram) {
    return null;
  }

  return <Editor diagram={diagram} />;
}
