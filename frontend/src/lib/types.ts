export type DiagramKind = "SchemaDiagram" | "GenericDiagram";

export interface Diagram {
  shareToken: string;
  title: string;
  kind: DiagramKind;
  content: string;
  updatedAt: string;
}
