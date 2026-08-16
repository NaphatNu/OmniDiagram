import { DiagramKind } from "@/lib/types";

const styles: Record<DiagramKind, string> = {
  SchemaDiagram:
    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  GenericDiagram:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
};

export function KindBadge({ kind }: { kind: DiagramKind }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[kind]}`}
    >
      {kind}
    </span>
  );
}
