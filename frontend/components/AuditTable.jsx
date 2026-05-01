"use client";
import { useState, useMemo } from "react";

function getRowStyle(entry) {
  if (entry.eventType === "HONEY_TOKEN_ALERT") return "border-l-4 border-purple-500 bg-purple-900/20";
  if (entry.eventType === "GOVERNANCE_VOTE") return "border-l-4 border-blue-500 bg-blue-900/20";
  if (entry.outcome === "APPROVED") return "border-l-4 border-green-500 bg-green-900/10";
  if (entry.outcome === "DENIED") return "border-l-4 border-red-500 bg-red-900/20";
  if (entry.anomalyFlags?.length > 0) return "border-l-4 border-orange-500 bg-orange-900/20";
  return "border-l-4 border-yellow-500 bg-yellow-900/10";
}

function getOutcomeColor(outcome) {
  if (outcome === "APPROVED") return "text-green-400";
  if (outcome === "DENIED") return "text-red-400";
  return "text-yellow-400";
}

function truncate(str, len = 12) {
  if (!str) return "—";
  const s = str.toString();
  return s.length > len ? `${s.slice(0, 6)}...${s.slice(-4)}` : s;
}

function formatTs(ts) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export default function AuditTable({ entries = [], onExpand }) {
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [filterType, setFilterType] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    let result = [...entries];
    if (filterType !== "all") {
      result = result.filter((e) => {
        if (filterType === "APPROVED") return e.outcome === "APPROVED";
        if (filterType === "DENIED") return e.outcome === "DENIED";
        if (filterType === "ANOMALY") return e.anomalyFlags?.length > 0;
        if (filterType === "HONEY") return e.eventType === "HONEY_TOKEN_ALERT";
        return true;
      });
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return result;
  }, [entries, sortKey, sortDir, filterType]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function handleExpand(i, entry) {
    const next = expanded === i ? null : i;
    setExpanded(next);
    if (next !== null) onExpand?.(entry);
  }

  return (
    <div className="audit-table font-mono text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-green-400 font-bold tracking-widest">IMMUTABLE AUDIT LOG</span>
        <select
          className="bg-gray-900 border border-green-800 text-green-400 text-xs p-1 rounded"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">ALL EVENTS</option>
          <option value="APPROVED">APPROVED</option>
          <option value="DENIED">DENIED</option>
          <option value="ANOMALY">ANOMALY</option>
          <option value="HONEY">LEVEL 5</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-green-600 border-b border-green-900">
              {[
                ["timestamp", "TIMESTAMP"],
                ["actor", "OFFICER"],
                ["eventType", "EVENT TYPE"],
                ["componentId", "COMPONENT"],
                ["outcome", "OUTCOME"],
                [null, "FLAGS"],
                [null, ""],
              ].map(([key, label]) => (
                <th
                  key={label}
                  className={`text-left p-2 ${key ? "cursor-pointer hover:text-green-400" : ""}`}
                  onClick={() => key && toggleSort(key)}
                >
                  {label}
                  {sortKey === key && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-green-900 py-4">NO ENTRIES</td>
              </tr>
            )}
            {filtered.map((entry, i) => (
              <>
                <tr key={i} className={`${getRowStyle(entry)} hover:brightness-125 transition-all`}>
                  <td className="p-2 text-green-600">{formatTs(entry.timestamp)}</td>
                  <td className="p-2 text-green-400">{truncate(entry.actor)}</td>
                  <td className="p-2 text-green-300">{entry.eventType || "—"}</td>
                  <td className="p-2 text-green-600">{truncate(entry.componentId)}</td>
                  <td className={`p-2 font-bold ${getOutcomeColor(entry.outcome)}`}>
                    {entry.outcome || "—"}
                  </td>
                  <td className="p-2">
                    {entry.anomalyFlags?.length > 0 && (
                      <span className="text-orange-400">
                        [{entry.anomalyFlags.length}]
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      className="text-green-700 hover:text-green-400 border border-green-900 hover:border-green-600 px-2 py-0.5 rounded transition-all"
                      onClick={() => handleExpand(i, entry)}
                    >
                      {expanded === i ? "▲" : "▼"}
                    </button>
                  </td>
                </tr>
                {expanded === i && (
                  <tr key={`exp-${i}`} className="bg-gray-950">
                    <td colSpan={7} className="p-3 border-b border-green-900">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-green-700">BLOCK NUMBER: </span><span className="text-green-400">{entry.blockNumber || "—"}</span></div>
                        <div><span className="text-green-700">ROOT HASH: </span><span className="text-green-400 break-all">{entry.rootHash || "—"}</span></div>
                        <div><span className="text-green-700">FULL ACTOR: </span><span className="text-green-400 break-all">{entry.actor || "—"}</span></div>
                        <div><span className="text-green-700">FULL COMPONENT: </span><span className="text-green-400 break-all">{entry.componentId || "—"}</span></div>
                        <div><span className="text-green-700">DENIAL REASON: </span><span className="text-red-400">{entry.denialReason || "N/A"}</span></div>
                        <div><span className="text-green-700">LOCATION HASH: </span><span className="text-green-400 break-all">{entry.locationHash || "—"}</span></div>
                        {entry.anomalyFlags?.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-green-700">ANOMALY FLAGS: </span>
                            <span className="text-orange-400">{entry.anomalyFlags.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-green-900 text-xs">
        {filtered.length} ENTRIES — READ ONLY — NO MODIFY FUNCTION EXISTS
      </div>
    </div>
  );
}
