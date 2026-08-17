"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { EditorHeader } from "@/components/EditorHeader";
import { RevisionPanel } from "@/components/RevisionPanel";
import { SchemaDiagramEditor } from "@/components/SchemaDiagramEditor";
import { GenericDiagramEditor } from "@/components/GenericDiagramEditor";
import { useDiagramEditor } from "@/hooks/useDiagramEditor";
import { ApiError, getDiagram } from "@/lib/api";
import { Diagram } from "@/lib/types";

function Editor({ diagram }: { diagram: Diagram }) {
  const editor = useDiagramEditor(diagram);
  const [historyOpen, setHistoryOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-1 flex-col">
      <EditorHeader
        diagram={editor.diagram}
        content={editor.content}
        isDirty={editor.isDirty}
        isSaving={editor.isSaving}
        error={editor.error}
        onSave={editor.save}
        isHistoryOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((open) => !open)}
        canvasRef={canvasRef}
        onImport={editor.setContent}
      />
      <div className="flex flex-1 overflow-hidden">
        <div ref={canvasRef} className="flex flex-1 flex-col">
          {editor.diagram.kind === "SchemaDiagram" ? (
            <SchemaDiagramEditor
              content={editor.content}
              onContentChange={editor.setContent}
              layout={editor.layout}
              onLayoutChange={editor.setLayout}
            />
          ) : (
            <GenericDiagramEditor content={editor.content} onContentChange={editor.setContent} />
          )}
        </div>
        {historyOpen && (
          <RevisionPanel
            shareToken={editor.diagram.shareToken}
            isDirty={editor.isDirty}
            refreshToken={editor.diagram.updatedAt}
            onClose={() => setHistoryOpen(false)}
            onReverted={editor.applyDiagram}
          />
        )}
      </div>
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
