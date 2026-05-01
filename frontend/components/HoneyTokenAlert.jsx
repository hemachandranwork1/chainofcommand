"use client";

export default function HoneyTokenAlert({ alert, onDismiss }) {
  if (!alert) return null;

  const ts = alert.timestamp
    ? new Date(alert.timestamp).toISOString().replace("T", " ").slice(0, 19)
    : "UNKNOWN";

  return (
    <div className="honey-token-alert font-mono relative">
      <style>{`
        @keyframes honeyPulse {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(168,85,247,0.4); border-color: rgba(168,85,247,0.8); }
          50% { box-shadow: 0 0 20px 6px rgba(168,85,247,0.7); border-color: rgba(168,85,247,1); }
        }
        .honey-pulse { animation: honeyPulse 1.5s ease-in-out infinite; }
      `}</style>

      <div className="honey-pulse border-2 border-purple-500 rounded bg-gray-950 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-lg">⬡</span>
            <span className="text-purple-400 font-bold text-xs tracking-widest">
              LEVEL 5 — HONEY-TOKEN TRAP TRIGGERED
            </span>
          </div>
          <span className="border border-purple-700 text-purple-400 text-xs px-2 py-0.5 rounded font-bold">
            CLASSIFIED
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <span className="text-purple-700">SESSION ID: </span>
            <span className="text-purple-300 break-all">{alert.sessionId || "UNKNOWN"}</span>
          </div>
          <div>
            <span className="text-purple-700">ACCESSOR ROLE: </span>
            <span className="text-purple-300">{alert.role || "UNKNOWN"}</span>
          </div>
          <div>
            <span className="text-purple-700">TIMESTAMP: </span>
            <span className="text-purple-300">{ts}</span>
          </div>
          <div>
            <span className="text-purple-700">ALERT TYPE: </span>
            <span className="text-red-400">UNAUTHORIZED RECONNAISSANCE</span>
          </div>
          <div className="col-span-2">
            <span className="text-purple-700">PHANTOM HASH QUERIED: </span>
            <span className="text-purple-300 break-all text-xs">
              {alert.hash || "UNKNOWN"}
            </span>
          </div>
          {alert.reason && (
            <div className="col-span-2">
              <span className="text-purple-700">REASON: </span>
              <span className="text-orange-400">{alert.reason}</span>
            </div>
          )}
        </div>

        <div className="border border-purple-900 bg-purple-900/10 rounded p-2 mb-3">
          <div className="text-purple-600 text-xs">
            A phantom component was accessed from an unauthorized context.
            The accessor does not know they triggered this alert.
            Investigation recommended. All access logs preserved immutably.
          </div>
        </div>

        <button
          onClick={() => onDismiss?.("COMMANDER")}
          className="w-full border border-purple-600 text-purple-400 hover:bg-purple-900/20 text-xs py-1.5 rounded transition-all font-bold tracking-widest"
        >
          COMMANDER ACKNOWLEDGE & LOG DISMISSAL
        </button>
      </div>
    </div>
  );
}
