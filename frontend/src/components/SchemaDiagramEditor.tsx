"use client";

import { useMemo } from "react";
import {
  applyNodeChanges,
  Background,
  Controls,
  Node,
  NodeChange,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Parser } from "@dbml/core";
import { mergeLayout } from "@/lib/layout";
import { Position } from "@/lib/types";

function tablesToNodes(
  dbml: string,
  layout: Record<string, Position>,
): { nodes: Node[]; error: string | null; tableNames: string[] } {
  try {
    const database = new Parser().parse(dbml, "dbml");
    const tables = database.schemas[0]?.tables ?? [];
    const tableNames = tables.map((table) => table.name);
    const positions = mergeLayout(tableNames, layout);
    const nodes: Node[] = tables.map((table) => ({
      id: table.name,
      position: positions[table.name],
      data: {
        label: (
          <div className="text-left">
            <div className="border-b border-black/10 px-2 py-1 text-sm font-semibold dark:border-white/10">
              {table.name}
            </div>
            <div className="px-2 py-1">
              {table.fields.map((field) => (
                <div key={field.name} className="text-xs">
                  {field.name}{" "}
                  <span className="text-zinc-500">{field.type.type_name}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      style: {
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 8,
        padding: 0,
        width: 220,
      },
    }));
    return { nodes, error: null, tableNames };
  } catch (err) {
    return { nodes: [], error: err instanceof Error ? err.message : "Invalid DBML", tableNames: [] };
  }
}

export function SchemaDiagramEditor({
  content,
  onContentChange,
  layout,
  onLayoutChange,
}: {
  content: string;
  onContentChange: (content: string) => void;
  layout: Record<string, Position>;
  onLayoutChange: (layout: Record<string, Position>) => void;
}) {
  const { nodes, error, tableNames } = useMemo(
    () => tablesToNodes(content, layout),
    [content, layout],
  );

  function handleNodesChange(changes: NodeChange[]) {
    if (!changes.some((change) => change.type === "position")) {
      return;
    }
    const updatedNodes = applyNodeChanges(changes, nodes);
    const nextLayout: Record<string, Position> = {};
    for (const node of updatedNodes) {
      if (tableNames.includes(node.id)) {
        nextLayout[node.id] = { x: node.position.x, y: node.position.y };
      }
    }
    onLayoutChange(nextLayout);
  }

  return (
    <div className="grid flex-1 grid-cols-2">
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        spellCheck={false}
        className="h-full resize-none border-r border-black/10 bg-transparent p-4 font-mono text-sm outline-none dark:border-white/10"
      />
      <div className="relative h-full">
        {error ? (
          <div className="p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <ReactFlowProvider>
            <ReactFlow nodes={nodes} edges={[]} onNodesChange={handleNodesChange} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
