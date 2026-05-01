"use client";
import { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

const NODE_TYPES_ORDER = ["MANUFACTURER", "VENDOR", "INSPECTION", "BASE", "DEPLOYMENT"];

function buildNodes(componentHistory = [], compromisedManufacturer = "", revocationMode = false) {
  const nodes = [];
  const edges = [];

  if (!componentHistory.length) return { nodes, edges };

  componentHistory.forEach((transfer, i) => {
    const isGap = !transfer.verified;
    const isCompromised =
      revocationMode &&
      transfer.from?.toLowerCase() === compromisedManufacturer?.toLowerCase();

    const color = isCompromised
      ? "#f97316"
      : isGap
        ? "#ef4444"
        : "#16a34a";

    const fromId = `node-${transfer.from || "origin"}-${i}`;
    const toId = `node-${transfer.to || "dest"}-${i + 1}`;

    if (!nodes.find((n) => n.id === fromId)) {
      nodes.push({
        id: fromId,
        position: { x: i * 200, y: 100 },
        data: {
          label: (
            <div className="text-xs font-mono text-center">
              <div className="font-bold">{NODE_TYPES_ORDER[i] || "NODE"}</div>
              <div className="text-gray-400">{transfer.from?.slice(0, 8)}...</div>
            </div>
          ),
          hash: transfer.from,
          isGap,
          isCompromised,
        },
        style: {
          background: "#0a140a",
          border: `2px solid ${color}`,
          borderRadius: "8px",
          color,
          minWidth: 120,
        },
      });
    }

    if (!nodes.find((n) => n.id === toId)) {
      nodes.push({
        id: toId,
        position: { x: (i + 1) * 200, y: 100 },
        data: {
          label: (
            <div className="text-xs font-mono text-center">
              <div className="font-bold">{NODE_TYPES_ORDER[i + 1] || "NODE"}</div>
              <div className="text-gray-400">{transfer.to?.slice(0, 8)}...</div>
            </div>
          ),
          hash: transfer.to,
          isGap,
        },
        style: {
          background: "#0a140a",
          border: `2px solid ${isGap ? "#ef4444" : "#16a34a"}`,
          borderRadius: "8px",
          color: isGap ? "#ef4444" : "#16a34a",
          minWidth: 120,
        },
      });
    }

    edges.push({
      id: `edge-${i}`,
      source: fromId,
      target: toId,
      animated: isGap || isCompromised,
      style: {
        stroke: isCompromised ? "#f97316" : isGap ? "#ef4444" : "#16a34a",
        strokeWidth: isGap ? 3 : 1.5,
        strokeDasharray: isGap ? "5,5" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isGap ? "#ef4444" : "#16a34a",
      },
      label: isGap ? "⚠ GAP DETECTED" : transfer.verified ? "✓ VERIFIED" : "",
      labelStyle: { fill: isGap ? "#ef4444" : "#16a34a", fontSize: 10, fontFamily: "monospace" },
    });
  });

  return { nodes, edges };
}

export default function SupplyChainGraph({
  componentHistory = [],
  compromisedManufacturer = "",
  revocationMode = false,
}) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodes(componentHistory, compromisedManufacturer, revocationMode),
    [componentHistory, compromisedManufacturer, revocationMode]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildNodes(componentHistory, compromisedManufacturer, revocationMode);
    setNodes(n);
    setEdges(e);
  }, [componentHistory, compromisedManufacturer, revocationMode]);

  const hasGap = componentHistory.some((t) => !t.verified);
  const hasCompromised = revocationMode && compromisedManufacturer;

  return (
    <div className="supply-chain-graph font-mono">
      {(hasGap || hasCompromised) && (
        <div className={`mb-2 p-2 rounded border text-xs font-bold ${hasGap
            ? "bg-red-900/30 border-red-500 text-red-400"
            : "bg-orange-900/30 border-orange-500 text-orange-400"
          }`}>
          {hasGap && "⚠ MERKLE PATH FAILURE DETECTED — SUPPLY CHAIN INTEGRITY COMPROMISED"}
          {hasCompromised && !hasGap && "⚠ RECURSIVE REVOCATION ACTIVE — MANUFACTURER FLAGGED"}
        </div>
      )}

      <div style={{ height: 350, background: "#030f03", borderRadius: 8, border: "1px solid #166534" }}>
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-800 text-xs">
            NO COMPONENT DATA — SCAN QR TO LOAD SUPPLY CHAIN
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
            <Controls style={{ background: "#0a140a", border: "1px solid #166534" }} />
            <MiniMap
              style={{ background: "#030f03", border: "1px solid #166534" }}
              nodeColor={(n) => n.style?.border?.includes("ef4444") ? "#ef4444" :
                n.style?.border?.includes("f97316") ? "#f97316" : "#16a34a"}
            />
          </ReactFlow>
        )}
      </div>

      <div className="flex gap-4 mt-2 text-xs">
        {[
          { color: "bg-green-500", label: "VERIFIED TRANSFER" },
          { color: "bg-red-500", label: "GAP / UNVERIFIED" },
          { color: "bg-orange-500", label: "REVOKED MANUFACTURER" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1 text-green-600">
            <div className={`w-3 h-3 rounded-sm ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
