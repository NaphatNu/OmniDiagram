"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Parser } from "@dbml/core";

function tablesToNodes(dbml: string): { nodes: Node[]; error: string | null } {
  try {
    const database = new Parser().parse(dbml, "dbml");
    const tables = database.schemas[0]?.tables ?? [];
    const nodes: Node[] = tables.map((table, index) => ({
      id: table.name,
      position: { x: (index % 4) * 260, y: Math.floor(index / 4) * 220 },
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
    return { nodes, error: null };
  } catch (err) {
    return { nodes: [], error: err instanceof Error ? err.message : "Invalid DBML" };
  }
}

export function SchemaDiagramEditor({
  content,
  onContentChange,
}: {
  content: string;
  onContentChange: (content: string) => void;
}) {
  const { nodes, error } = useMemo(() => tablesToNodes(content), [content]);

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
            <ReactFlow nodes={nodes} edges={[]} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
