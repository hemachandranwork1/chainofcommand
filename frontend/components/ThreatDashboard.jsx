"use client";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const EVENT_COLORS = {
  PROCUREMENT_DENIED: { bg: "bg-red-900/40", border: "border-red-500", text: "text-red-400", label: "BLOCKED" },
  ANOMALY: { bg: "bg-orange-900/40", border: "border-orange-500", text: "text-orange-400", label: "ANOMALY" },
  WARNING: { bg: "bg-yellow-900/40", border: "border-yellow-500", text: "text-yellow-400", label: "WARNING" },
  PROCUREMENT_APPROVED: { bg: "bg-green-900/40", border: "border-green-500", text: "text-green-400", label: "APPROVED" },
  GOVERNANCE: { bg: "bg-blue-900/40", border: "border-blue-500", text: "text-blue-400", label: "GOVERNANCE" },
  HONEY_TOKEN: { bg: "bg-purple-900/40", border: "border-purple-500", text: "text-purple-400", label: "LEVEL 5" },
};

function getEventStyle(event) {
  if (event.eventType === "HONEY_TOKEN_ALERT") return EVENT_COLORS.HONEY_TOKEN;
  if (event.eventType === "GOVERNANCE_VOTE") return EVENT_COLORS.GOVERNANCE;
  if (event.outcome === "APPROVED") return EVENT_COLORS.PROCUREMENT_APPROVED;
  if (event.outcome === "DENIED") return EVENT_COLORS.PROCUREMENT_DENIED;
  if (event.anomalyFlags?.length > 0) return EVENT_COLORS.ANOMALY;
  if (event.eventType?.includes("WARNING")) return EVENT_COLORS.WARNING;
  return EVENT_COLORS.WARNING;
}

function buildChartData(events) {
  const buckets = {};
  events.forEach((e) => {
    const d = new Date(
      typeof e.timestamp === "number" && e.timestamp < 1e12 ? e.timestamp * 1000 : e.timestamp
    );
    const key = `${d.getHours()}:00`;
    if (!buckets[key]) buckets[key] = { time: key, BLOCKED: 0, APPROVED: 0, ANOMALY: 0, WARNING: 0 };
    const style = getEventStyle(e);
    if (style === EVENT_COLORS.PROCUREMENT_DENIED) buckets[key].BLOCKED++;
    else if (style === EVENT_COLORS.PROCUREMENT_APPROVED) buckets[key].APPROVED++;
    else if (style === EVENT_COLORS.ANOMALY) buckets[key].ANOMALY++;
    else buckets[key].WARNING++;
  });
  return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time));
}

export default function ThreatDashboard({ events = [], onFilter }) {
  const [filters, setFilters] = useState({
    timeRange: "all",
    officer: "",
    component: "",
    eventType: "all",
  });

  const filtered = useMemo(() => {
    let result = [...events];
    const now = Date.now();

    if (filters.timeRange !== "all") {
      const ms = { "1h": 3600000, "6h": 21600000, "24h": 86400000 }[filters.timeRange] || 0;
      result = result.filter((e) => {
        const ts = typeof e.timestamp === "number" && e.timestamp < 1e12 ? e.timestamp * 1000 : e.timestamp;
        return now - ts <= ms;
      });
    }
    if (filters.officer) {
      result = result.filter((e) =>
        e.actor?.toLowerCase().includes(filters.officer.toLowerCase())
      );
    }
    if (filters.component) {
      result = result.filter((e) =>
        e.componentId?.toLowerCase().includes(filters.component.toLowerCase())
      );
    }
    if (filters.eventType !== "all") {
      result = result.filter((e) => {
        const style = getEventStyle(e);
        return style.label === filters.eventType;
      });
    }
    return result;
  }, [events, filters]);

  const stats = useMemo(() => ({
    blocked: filtered.filter((e) => e.outcome === "DENIED").length,
    approved: filtered.filter((e) => e.outcome === "APPROVED").length,
    anomalies: filtered.filter((e) => e.anomalyFlags?.length > 0).length,
    honeyToken: filtered.filter((e) => e.eventType === "HONEY_TOKEN_ALERT").length,
  }), [filtered]);

  const chartData = useMemo(() => buildChartData(filtered), [filtered]);

  function handleFilterChange(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilter?.(next);
  }

  return (
    <div className="threat-dashboard bg-gray-950 border border-green-800 rounded p-4 font-mono">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-green-400 text-sm font-bold tracking-widest">THREAT DASHBOARD</h2>
        <span className="text-green-600 text-xs">{new Date().toISOString()}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "BLOCKED", value: stats.blocked, color: "text-red-400 border-red-700" },
          { label: "APPROVED", value: stats.approved, color: "text-green-400 border-green-700" },
          { label: "ANOMALIES", value: stats.anomalies, color: "text-orange-400 border-orange-700" },
          { label: "LVL 5 ALERTS", value: stats.honeyToken, color: "text-purple-400 border-purple-700" },
        ].map((s) => (
          <div key={s.label} className={`border rounded p-2 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <select
          className="bg-gray-900 border border-green-800 text-green-400 text-xs p-1 rounded"
          value={filters.timeRange}
          onChange={(e) => handleFilterChange("timeRange", e.target.value)}
        >
          <option value="all">ALL TIME</option>
          <option value="1h">LAST 1H</option>
          <option value="6h">LAST 6H</option>
          <option value="24h">LAST 24H</option>
        </select>
        <input
          className="bg-gray-900 border border-green-800 text-green-400 text-xs p-1 rounded placeholder-green-900"
          placeholder="FILTER OFFICER..."
          value={filters.officer}
          onChange={(e) => handleFilterChange("officer", e.target.value)}
        />
        <input
          className="bg-gray-900 border border-green-800 text-green-400 text-xs p-1 rounded placeholder-green-900"
          placeholder="FILTER COMPONENT..."
          value={filters.component}
          onChange={(e) => handleFilterChange("component", e.target.value)}
        />
        <select
          className="bg-gray-900 border border-green-800 text-green-400 text-xs p-1 rounded"
          value={filters.eventType}
          onChange={(e) => handleFilterChange("eventType", e.target.value)}
        >
          <option value="all">ALL TYPES</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="ANOMALY">ANOMALY</option>
          <option value="WARNING">WARNING</option>
          <option value="GOVERNANCE">GOVERNANCE</option>
          <option value="LEVEL 5">LEVEL 5</option>
        </select>
      </div>

      {chartData.length > 0 && (
        <div className="mb-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2a1a" />
              <XAxis dataKey="time" tick={{ fill: "#4ade80", fontSize: 10 }} />
              <YAxis tick={{ fill: "#4ade80", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#030f03", border: "1px solid #16a34a", color: "#4ade80" }}
              />
              <Bar dataKey="BLOCKED" fill="#dc2626" />
              <Bar dataKey="APPROVED" fill="#16a34a" />
              <Bar dataKey="ANOMALY" fill="#ea580c" />
              <Bar dataKey="WARNING" fill="#ca8a04" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-green-800 text-xs text-center py-4">NO EVENTS MATCHING FILTER</div>
        )}
        {filtered.map((event, i) => {
          const style = getEventStyle(event);
          const ts = typeof event.timestamp === "number" && event.timestamp < 1e12
            ? new Date(event.timestamp * 1000)
            : new Date(event.timestamp);
          return (
            <div key={i} className={`flex items-center gap-2 p-2 rounded border ${style.bg} ${style.border} text-xs`}>
              <span className={`px-1 py-0.5 rounded text-xs font-bold ${style.text} border ${style.border} w-20 text-center shrink-0`}>
                {style.label}
              </span>
              <span className="text-green-600 shrink-0 w-20">{ts.toTimeString().slice(0, 8)}</span>
              <span className={`${style.text} shrink-0`}>{event.eventType || "EVENT"}</span>
              <span className="text-green-700 truncate">
                {event.actor ? `${event.actor.slice(0, 8)}...` : ""}
              </span>
              {event.anomalyFlags?.length > 0 && (
                <span className="text-orange-400 shrink-0">[{event.anomalyFlags.join(", ")}]</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
