export type DiagramKind = "SchemaDiagram" | "GenericDiagram";

export interface Position {
  x: number;
  y: number;
}

export interface DiagramSummary {
  shareToken: string;
  title: string;
  kind: DiagramKind;
  updatedAt: string;
}

export interface Diagram extends DiagramSummary {
  content: string;
  layout: Record<string, Position>;
}

export interface DiagramPatch {
  title?: string;
  content?: string;
  layout?: Record<string, Position>;
}
