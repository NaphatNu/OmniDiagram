import { notFound } from "next/navigation";
import { EditorHeader } from "@/components/EditorHeader";
import { SchemaDiagramEditor } from "@/components/SchemaDiagramEditor";
import { GenericDiagramEditor } from "@/components/GenericDiagramEditor";
import { placeholderDiagrams } from "@/lib/placeholder-diagrams";

export default async function DiagramEditorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const diagram = placeholderDiagrams.find((d) => d.shareToken === token);

  if (!diagram) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <EditorHeader diagram={diagram} />
      {diagram.kind === "SchemaDiagram" ? (
        <SchemaDiagramEditor content={diagram.content} />
      ) : (
        <GenericDiagramEditor content={diagram.content} />
      )}
    </div>
  );
}
