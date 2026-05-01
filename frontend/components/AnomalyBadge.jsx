"use client";

const ANOMALY_CONFIG = {
  TIME_ANOMALY: { level: "medium", color: "bg-yellow-900/30 border-yellow-600 text-yellow-400", icon: "🕐", short: "TIME" },
  RATE_LIMIT_EXCEEDED: { level: "critical", color: "bg-red-900/30 border-red-500 text-red-400", icon: "⚡", short: "RATE" },
  CLONING_DETECTED: { level: "critical", color: "bg-red-900/30 border-red-500 text-red-400", icon: "⊗", short: "CLONE" },
  CLEARANCE_VIOLATION: { level: "critical", color: "bg-red-900/30 border-red-500 text-red-400", icon: "🔒", short: "CLRNC" },
  FAILED_ATTEMPTS: { level: "high", color: "bg-orange-900/30 border-orange-500 text-orange-400", icon: "⚠", short: "FAIL" },
  HONEY_TOKEN: { level: "critical", color: "bg-purple-900/30 border-purple-500 text-purple-400", icon: "⬡", short: "LVL5" },
  SUPPLY_CHAIN_GAP: { level: "critical", color: "bg-red-900/30 border-red-500 text-red-400", icon: "⛓", short: "GAP" },
  DEVICE_COMPROMISED: { level: "critical", color: "bg-red-900/30 border-red-500 text-red-400", icon: "💻", short: "DEV" },
  DEFAULT: { level: "medium", color: "bg-yellow-900/30 border-yellow-600 text-yellow-400", icon: "!", short: "ANOM" },
};

export default function AnomalyBadge({ anomalies = [] }) {
  if (!anomalies || anomalies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center font-mono">
      {anomalies.map((anomaly, i) => {
        const config = ANOMALY_CONFIG[anomaly] || ANOMALY_CONFIG.DEFAULT;
        return (
          <div
            key={i}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-bold ${config.color}`}
            title={anomaly}
          >
            <span>{config.icon}</span>
            <span>{config.short}</span>
          </div>
        );
      })}
    </div>
  );
}
