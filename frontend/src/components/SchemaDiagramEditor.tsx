"use client";

import { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  Node,
  NodeChange,
  NodeProps,
  NodeTypes,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Parser } from "@dbml/core";
import { mergeLayout } from "@/lib/layout";
import {
  buildRelationshipEdges,
  classifyRelationshipType,
  connectionsForTable,
  edgesForField,
  RelationshipEdge as RelationshipEdgeData,
  RelationshipType,
} from "@/lib/relationships";
import { Position as LayoutPosition } from "@/lib/types";
import { RelationshipEdge, RELATIONSHIP_TYPE_COLORS, HighlightContext } from "./RelationshipEdge";

interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  fields: { name: string; typeName: string }[];
}

function TableNode({ data }: NodeProps<Node<TableNodeData>>) {
  const { highlightedTables, onFieldClick } = useContext(HighlightContext);
  const isHighlighted = highlightedTables?.has(data.tableName) ?? false;
  const isDimmed = highlightedTables !== null && !isHighlighted;

  return (
    <div
      data-testid={`table-node-${data.tableName}`}
      style={{
        // A constant-width border with only the color changing (rather than
        // 1px <-> 2px) keeps the node's box dimensions fixed regardless of
        // highlight state — flipping border-width mid-gesture was observed
        // to abort an in-progress react-flow drag (likely a ResizeObserver
        // remeasure resetting the drag's reference frame).
        border: `2px solid ${isHighlighted ? "#2563eb" : "var(--table-border-idle)"}`,
        borderRadius: 8,
        width: 220,
        opacity: isDimmed ? 0.4 : 1,
      }}
      className="bg-background text-left"
    >
      <div className="border-b border-black/10 px-2 py-1 text-sm font-semibold dark:border-white/10">
        {data.tableName}
      </div>
      <div className="px-2 py-1">
        {data.fields.map((field) => (
          <div
            key={field.name}
            data-testid={`field-${data.tableName}-${field.name}`}
            onClick={() => onFieldClick(data.tableName, field.name)}
            className="relative cursor-pointer text-xs hover:bg-black/5 dark:hover:bg-white/5"
          >
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

const LEGEND_LABELS: Record<RelationshipType, string> = {
  "one-to-one": "One-to-one",
  "one-to-many": "One-to-many",
  "many-to-many": "Many-to-many",
};

function RelationshipLegend() {
  return (
    <Panel
      position="bottom-left"
      className="flex flex-col gap-1 rounded-md border border-black/10 bg-background/90 p-2 text-xs dark:border-white/10"
    >
      {(Object.keys(LEGEND_LABELS) as RelationshipType[]).map((type) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[type] }}
          />
          <span className="text-zinc-600 dark:text-zinc-300">{LEGEND_LABELS[type]}</span>
        </div>
      ))}
    </Panel>
  );
}

function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
}: {
  nodes: Node[];
  edges: RelationshipEdgeData[];
  onNodesChange: (changes: NodeChange[]) => void;
}) {
  const { setCenter, getNode } = useReactFlow();
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [jumpTables, setJumpTables] = useState<Set<string> | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMovingRef = useRef(false);
  const moveEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { highlightedTables, highlightedEdgeIds } = useMemo(() => {
    if (hoveredTable) {
      const conn = connectionsForTable(hoveredTable, edges);
      return {
        highlightedTables: new Set<string>([hoveredTable, ...conn.tableNames]),
        highlightedEdgeIds: conn.edgeIds,
      };
    }
    return { highlightedTables: jumpTables, highlightedEdgeIds: null as Set<string> | null };
  }, [hoveredTable, jumpTables, edges]);

  const handleFieldClick = useCallback(
    (tableName: string, fieldName: string) => {
      const targets = edgesForField(tableName, fieldName, edges);
      if (targets.length === 0) {
        return;
      }
      const destinations = new Set<string>();
      for (const edge of targets) {
        destinations.add(edge.source === tableName ? edge.target : edge.source);
      }
      const firstDestination = getNode([...destinations][0]);
      if (firstDestination) {
        setCenter(firstDestination.position.x + 110, firstDestination.position.y + 60, {
          zoom: 1,
          duration: 400,
        });
      }
      destinations.add(tableName);
      setJumpTables(destinations);
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
      }
      jumpTimeoutRef.current = setTimeout(() => setJumpTables(null), 1500);
    },
    [edges, getNode, setCenter],
  );

  const highlightValue = useMemo(
    () => ({ highlightedTables, highlightedEdgeIds, onFieldClick: handleFieldClick }),
    [highlightedTables, highlightedEdgeIds, handleFieldClick],
  );

  // flowEdges only carries data that's stable regardless of hover/click
  // state (cardinalities, type, self-loop), so it — like `nodes` — never
  // changes identity on hover. Highlight/dim state flows through
  // HighlightContext instead of node/edge `data`, deliberately: see the
  // comment on HighlightContext for why (rebuilding nodes/edges on every
  // hover was observed to abort an in-progress drag).
  const flowEdges = useMemo(
    () =>
      edges
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
            relationshipType: classifyRelationshipType(edge),
          },
        })),
    [edges],
  );

  return (
    <HighlightContext.Provider value={highlightValue}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        // Mitigation for #63: freeze hover-driven highlight changes while the
        // viewport is actively panning/zooming, so a stationary cursor can't
        // have tables slide underneath it and flip highlight state. Ignore-only,
        // not clear-on-start — clearing would pop the highlight off the instant
        // an idle hover's mouse does an incidental wheel-zoom, which is worse
        // than doing nothing. Also fires (harmlessly) around the initial
        // fitView and handleFieldClick's setCenter, both of which go through
        // the same viewport-transform path.
        //
        // A continuous wheel-driven trackpad pan fires onMoveStart/onMoveEnd
        // in pairs per tick (per wheel event/animation frame), not once for
        // the whole gesture — confirmed from a real screen recording in #63.
        // Clearing isMovingRef synchronously on every onMoveEnd left a window
        // between ticks where a real, transform-driven mouseleave could slip
        // through and clear hoveredTable, with no mouseenter ever arriving to
        // restore it since the OS pointer itself never moved. Debouncing the
        // "gesture ended" transition with a short trailing delay bridges those
        // inter-tick gaps so isMovingRef stays true for the whole gesture.
        onMoveStart={() => {
          if (moveEndTimeoutRef.current) {
            clearTimeout(moveEndTimeoutRef.current);
            moveEndTimeoutRef.current = null;
          }
          isMovingRef.current = true;
        }}
        onMoveEnd={() => {
          if (moveEndTimeoutRef.current) {
            clearTimeout(moveEndTimeoutRef.current);
          }
          moveEndTimeoutRef.current = setTimeout(() => {
            isMovingRef.current = false;
            moveEndTimeoutRef.current = null;
          }, 150);
        }}
        onNodeMouseEnter={(_, node) => {
          if (isMovingRef.current) return;
          setHoveredTable(node.id);
        }}
        onNodeMouseLeave={() => {
          if (isMovingRef.current) return;
          setHoveredTable(null);
        }}
        fitView
      >
        <Background />
        <Controls />
        <RelationshipLegend />
      </ReactFlow>
    </HighlightContext.Provider>
  );
}

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
                <FlowCanvas nodes={nodes} edges={edges} onNodesChange={handleNodesChange} />
              </ReactFlowProvider>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
