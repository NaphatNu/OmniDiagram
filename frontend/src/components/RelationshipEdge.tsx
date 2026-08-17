"use client";

import { createContext, useContext } from "react";
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { Cardinality, RelationshipType } from "@/lib/relationships";

const SELF_LOOP_OFFSET = 70;

export const RELATIONSHIP_TYPE_COLORS: Record<RelationshipType, string> = {
  "one-to-one": "#2563eb",
  "one-to-many": "#16a34a",
  "many-to-many": "#dc2626",
};

/**
 * Hover/click-to-jump highlight state, shared via context rather than baked
 * into react-flow's `nodes`/`edges` props. Recreating those arrays/objects
 * on every hover was observed to abort an in-progress drag (react-flow's
 * controlled-mode re-sync from a changed `nodes` prop resets the drag's
 * reference frame mid-gesture) — context lets highlight state change
 * without ever touching node/edge identity.
 */
export interface HighlightState {
  highlightedTables: Set<string> | null;
  highlightedEdgeIds: Set<string> | null;
  onFieldClick: (tableName: string, fieldName: string) => void;
}

export const HighlightContext = createContext<HighlightState>({
  highlightedTables: null,
  highlightedEdgeIds: null,
  onFieldClick: () => {},
});

function selfLoopPath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  return `M ${sourceX} ${sourceY} C ${sourceX + SELF_LOOP_OFFSET} ${sourceY}, ${targetX + SELF_LOOP_OFFSET} ${targetY}, ${targetX} ${targetY}`;
}

function CardinalityMarker({
  label,
  x,
  y,
  dimmed,
}: {
  label: Cardinality;
  x: number;
  y: number;
  dimmed: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        pointerEvents: "none",
        opacity: dimmed ? 0.2 : 1,
      }}
      className="rounded border border-black/10 bg-background px-1 text-[10px] font-semibold text-zinc-600 dark:border-white/10 dark:text-zinc-300"
    >
      {label === "1" ? "1" : "∞"}
    </div>
  );
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) {
  const { highlightedTables, highlightedEdgeIds } = useContext(HighlightContext);
  const sourceCardinality = (data?.sourceCardinality as Cardinality | undefined) ?? "*";
  const targetCardinality = (data?.targetCardinality as Cardinality | undefined) ?? "*";
  const selfReferencing = Boolean(data?.selfReferencing);
  const relationshipType = (data?.relationshipType as RelationshipType | undefined) ?? "one-to-many";
  const isHighlighted = highlightedEdgeIds?.has(id) ?? false;
  const isDimmed = highlightedTables !== null && !isHighlighted;

  const [path] = selfReferencing
    ? [selfLoopPath(sourceX, sourceY, targetX, targetY)]
    : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const midX = selfReferencing
    ? Math.max(sourceX, targetX) + SELF_LOOP_OFFSET
    : (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const edgeStyle = {
    ...style,
    stroke: RELATIONSHIP_TYPE_COLORS[relationshipType],
    strokeWidth: isHighlighted ? 2.5 : 1.5,
    opacity: isDimmed ? 0.2 : 1,
  };

  return (
    <>
      <BaseEdge id={id} path={path} style={edgeStyle} />
      <EdgeLabelRenderer>
        <CardinalityMarker
          label={sourceCardinality}
          x={selfReferencing ? sourceX + 16 : sourceX + (midX - sourceX) * 0.15}
          y={selfReferencing ? sourceY : sourceY + (midY - sourceY) * 0.15}
          dimmed={isDimmed}
        />
        <CardinalityMarker
          label={targetCardinality}
          x={selfReferencing ? targetX + 16 : targetX + (midX - targetX) * 0.15}
          y={selfReferencing ? targetY : targetY + (midY - targetY) * 0.15}
          dimmed={isDimmed}
        />
      </EdgeLabelRenderer>
    </>
  );
}
