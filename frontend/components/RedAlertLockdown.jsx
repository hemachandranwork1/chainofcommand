"use client";
import { useEffect } from "react";

export default function RedAlertLockdown({
  anomalies = [],
  blockedEvent = null,
  onDismiss,
  visible = false,
}) {
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes redPulse {
          0%, 100% { background-color: rgba(127,0,0,0.85); }
          50% { background-color: rgba(185,0,0,0.92); }
        }
        @keyframes textFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .red-overlay { animation: redPulse 1.2s ease-in-out infinite; }
        .system-lock-text { animation: textFlash 0.8s ease-in-out infinite; }
      `}</style>

      <div
        className="red-overlay fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ pointerEvents: "all" }}
      >
        <div className="font-mono text-center max-w-2xl w-full px-6">
          <div className="system-lock-text text-white text-5xl font-bold tracking-widest mb-4">
            ⚠ SYSTEM LOCK ⚠
          </div>

          <div className="text-red-200 text-sm tracking-widest mb-6">
            CRITICAL ANOMALY DETECTED — PROCUREMENT BLOCKED
          </div>

          <div className="border border-red-300/30 bg-black/40 rounded p-4 mb-4 text-left">
            <div className="text-red-300 text-xs font-bold mb-2 tracking-widest">
              TRIGGERED ANOMALIES:
            </div>
            <div className="space-y-1">
              {anomalies.map((a, i) => (
                <div key={i} className="text-red-200 text-xs flex items-center gap-2">
                  <span className="text-red-400">▶</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {blockedEvent && (
            <div className="border border-red-300/30 bg-black/40 rounded p-4 mb-4 text-left">
              <div className="text-red-300 text-xs font-bold mb-2 tracking-widest">
                BLOCKED PROCUREMENT:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-red-500">OFFICER: </span>
                  <span className="text-red-200">{blockedEvent.officer?.slice(0, 14)}...</span>
                </div>
                <div>
                  <span className="text-red-500">COMPONENT: </span>
                  <span className="text-red-200">{blockedEvent.componentId?.toString().slice(0, 12)}...</span>
                </div>
                <div>
                  <span className="text-red-500">REASON: </span>
                  <span className="text-red-200">{blockedEvent.reason || "MULTI-ANOMALY"}</span>
                </div>
                <div>
                  <span className="text-red-500">TIME: </span>
                  <span className="text-red-200">{new Date().toTimeString().slice(0, 8)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-red-400 text-xs mb-4">
            ALL BACKGROUND OPERATIONS SUSPENDED. COMMANDER AUTHORIZATION REQUIRED TO RESUME.
          </div>

          <button
            onClick={() => onDismiss?.("COMMANDER")}
            className="border-2 border-white text-white hover:bg-white/10 font-mono font-bold tracking-widest text-sm px-8 py-3 rounded transition-all"
          >
            COMMANDER CONFIRM & LOG DISMISSAL
          </button>

          <div className="text-red-600 text-xs mt-3">
            This dismissal will be recorded immutably in the audit trail.
          </div>
        </div>
      </div>
    </>
  );
}
