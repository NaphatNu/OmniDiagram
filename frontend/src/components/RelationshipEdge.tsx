"use client";

import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";
import { Cardinality } from "@/lib/relationships";

const SELF_LOOP_OFFSET = 70;

function selfLoopPath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  return `M ${sourceX} ${sourceY} C ${sourceX + SELF_LOOP_OFFSET} ${sourceY}, ${targetX + SELF_LOOP_OFFSET} ${targetY}, ${targetX} ${targetY}`;
}

function CardinalityMarker({ label, x, y }: { label: Cardinality; x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        pointerEvents: "none",
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
  const sourceCardinality = (data?.sourceCardinality as Cardinality | undefined) ?? "*";
  const targetCardinality = (data?.targetCardinality as Cardinality | undefined) ?? "*";
  const selfReferencing = Boolean(data?.selfReferencing);

  const [path] = selfReferencing
    ? [selfLoopPath(sourceX, sourceY, targetX, targetY)]
    : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const midX = selfReferencing
    ? Math.max(sourceX, targetX) + SELF_LOOP_OFFSET
    : (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      <EdgeLabelRenderer>
        <CardinalityMarker
          label={sourceCardinality}
          x={selfReferencing ? sourceX + 16 : sourceX + (midX - sourceX) * 0.15}
          y={selfReferencing ? sourceY : sourceY + (midY - sourceY) * 0.15}
        />
        <CardinalityMarker
          label={targetCardinality}
          x={selfReferencing ? targetX + 16 : targetX + (midX - targetX) * 0.15}
          y={selfReferencing ? targetY : targetY + (midY - targetY) * 0.15}
        />
      </EdgeLabelRenderer>
    </>
  );
}
