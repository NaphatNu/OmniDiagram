"use client";

import { useMemo } from "react";
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  Node,
  NodeChange,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Parser } from "@dbml/core";
import { mergeLayout } from "@/lib/layout";
import { buildRelationshipEdges, RelationshipEdge as RelationshipEdgeData } from "@/lib/relationships";
import { Position as LayoutPosition } from "@/lib/types";
import { RelationshipEdge } from "./RelationshipEdge";

interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  fields: { name: string; typeName: string }[];
}

function TableNode({ data }: NodeProps<Node<TableNodeData>>) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 8,
        width: 220,
      }}
      className="bg-background text-left"
    >
      <div className="border-b border-black/10 px-2 py-1 text-sm font-semibold dark:border-white/10">
        {data.tableName}
      </div>
      <div className="px-2 py-1">
        {data.fields.map((field) => (
          <div key={field.name} className="relative text-xs">
            <Handle
              type="target"
              position={Position.Left}
              id={field.name}
              style={{ top: "50%", background: "transparent", border: "none" }}
            />
            {field.name} <span className="text-zinc-500">{field.typeName}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={field.name}
              style={{ top: "50%", background: "transparent", border: "none" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { tableNode: TableNode };
const edgeTypes = { relationship: RelationshipEdge };

function tablesToNodes(
  dbml: string,
  layout: Record<string, LayoutPosition>,
): {
  nodes: Node[];
  edges: RelationshipEdgeData[];
  error: string | null;
  tableNames: string[];
} {
  try {
    const database = new Parser().parse(dbml, "dbml");
    const tables = database.schemas[0]?.tables ?? [];
    const refs = database.schemas[0]?.refs ?? [];
    const tableNames = tables.map((table) => table.name);
    const positions = mergeLayout(tableNames, layout);
    const nodes: Node[] = tables.map((table) => ({
      id: table.name,
      type: "tableNode",
      position: positions[table.name],
      data: {
        tableName: table.name,
        fields: table.fields.map((field) => ({ name: field.name, typeName: field.type.type_name })),
      },
    }));
    const edges = buildRelationshipEdges(
      tables.map((table) => ({ name: table.name, fields: table.fields.map((field) => ({ name: field.name })) })),
      refs.map((ref) => ({
        endpoints: ref.endpoints.map((endpoint) => ({
          tableName: endpoint.tableName,
          fieldNames: endpoint.fieldNames,
          relation: endpoint.relation,
        })),
      })),
    );
    return { nodes, edges, error: null, tableNames };
  } catch (err) {
    return {
      nodes: [],
      edges: [],
      error: err instanceof Error ? err.message : "Invalid DBML",
      tableNames: [],
    };
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
  layout: Record<string, LayoutPosition>;
  onLayoutChange: (layout: Record<string, LayoutPosition>) => void;
}) {
  const { nodes, edges, error, tableNames } = useMemo(
    () => tablesToNodes(content, layout),
    [content, layout],
  );

  const danglingEdges = edges.filter((edge) => edge.dangling);
  const flowEdges = edges
    .filter((edge) => !edge.dangling)
    .map((edge) => ({
      id: edge.id,
      type: "relationship",
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      data: {
        sourceCardinality: edge.sourceCardinality,
        targetCardinality: edge.targetCardinality,
        selfReferencing: edge.selfReferencing,
      },
    }));

  function handleNodesChange(changes: NodeChange[]) {
    if (!changes.some((change) => change.type === "position")) {
      return;
    }
    const updatedNodes = applyNodeChanges(changes, nodes);
    const nextLayout: Record<string, LayoutPosition> = {};
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
      <div className="relative flex h-full flex-col">
        {error ? (
          <div className="p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <>
            {danglingEdges.length > 0 && (
              <div className="border-b border-amber-400/40 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {danglingEdges.map((edge) => (
                  <div key={edge.id}>Broken reference: {edge.danglingReason}</div>
                ))}
              </div>
            )}
            <div className="relative flex-1">
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodesChange={handleNodesChange}
                  fitView
                >
                  <Background />
                  <Controls />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
