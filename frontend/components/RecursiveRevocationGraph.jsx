"use client";
import { useEffect, useCallback } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

function buildRevocationNodes(manufacturerAddress, components, revocationTriggered) {
  const nodes = [];
  const edges = [];

  nodes.push({
    id: "manufacturer",
    position: { x: 300, y: 0 },
    data: {
      label: (
        <div className="text-xs font-mono text-center">
          <div className="font-bold text-orange-400">MANUFACTURER</div>
          <div className="text-orange-600">{manufacturerAddress?.slice(0, 10)}...</div>
          {revocationTriggered && (
            <div className="text-red-400 font-bold">⚠ COMPROMISED</div>
          )}
        </div>
      ),
    },
    style: {
      background: "#0a140a",
      border: `2px solid ${revocationTriggered ? "#ef4444" : "#f97316"}`,
      borderRadius: "8px",
      minWidth: 140,
    },
  });

  components.forEach((comp, i) => {
    const cols = 4;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * 180 + (row % 2 === 0 ? 0 : 90);
    const y = row * 120 + 120;

    const color = revocationTriggered ? "#f97316" : "#16a34a";

    nodes.push({
      id: `comp-${i}`,
      position: { x, y },
      data: {
        label: (
          <div className="text-xs font-mono text-center">
            <div style={{ color }} className="font-bold">
              {comp.componentType || `COMP ${i + 1}`}
            </div>
            <div className="text-green-700">
              {comp.componentId?.toString().slice(0, 8) || "—"}...
            </div>
            {revocationTriggered && (
              <div className="text-orange-400 text-xs">FLAGGED</div>
            )}
          </div>
        ),
      },
      style: {
        background: "#0a140a",
        border: `2px solid ${color}`,
        borderRadius: "6px",
        minWidth: 120,
        transition: "all 0.5s ease",
      },
    });

    edges.push({
      id: `edge-${i}`,
      source: "manufacturer",
      target: `comp-${i}`,
      animated: revocationTriggered,
      style: {
        stroke: revocationTriggered ? "#f97316" : "#16a34a",
        strokeWidth: revocationTriggered ? 2 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: revocationTriggered ? "#f97316" : "#16a34a",
      },
    });
  });

  return { nodes, edges };
}

export default function RecursiveRevocationGraph({
  manufacturerAddress = "",
  components = [],
  revocationTriggered = false,
}) {
  const { nodes: initNodes, edges: initEdges } = buildRevocationNodes(
    manufacturerAddress, components, revocationTriggered
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildRevocationNodes(
      manufacturerAddress, components, revocationTriggered
    );
    setNodes(n);
    setEdges(e);
  }, [manufacturerAddress, components, revocationTriggered]);

  return (
    <div className="recursive-revocation-graph font-mono">
      {revocationTriggered && (
        <div className="mb-2 border border-orange-500 bg-orange-900/20 rounded p-2 text-xs text-orange-400 font-bold text-center animate-pulse">
          ⚠ RECURSIVE REVOCATION ACTIVE — {components.length} COMPONENTS FLAGGED
        </div>
      )}

      <div style={{ height: 380, background: "#030f03", borderRadius: 8, border: "1px solid #166534" }}>
        {components.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-800 text-xs">
            NO COMPONENTS REGISTERED TO THIS MANUFACTURER
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#0d1f0d" gap={20} />
          </ReactFlow>
        )}
      </div>

      <div className="flex gap-4 mt-2 text-xs text-green-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-500" />ACTIVE
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />REVOKED
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-500" />COMPROMISED MANUFACTURER
        </div>
        <div className="ml-auto text-green-700">
          TOTAL: {components.length} COMPONENTS
        </div>
      </div>
    </div>
  );
}
