export type DiagramKind = "SchemaDiagram" | "GenericDiagram";

export interface Diagram {
  id: string;
  shareToken: string;
  title: string;
  kind: DiagramKind;
  content: string;
  updatedAt: string;
}
