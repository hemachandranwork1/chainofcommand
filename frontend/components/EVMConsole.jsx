"use client";
import { useEffect, useRef } from "react";

const LOG_COLORS = {
  SUCCESS: "text-green-400",
  REVERT: "text-red-400",
  PENDING: "text-yellow-400",
  INFO: "text-green-600",
  ERROR: "text-red-500",
  WARNING: "text-orange-400",
};

export default function EVMConsole({ logs = [], onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="evm-console font-mono border border-green-900 rounded bg-black">
      <div className="flex items-center justify-between px-3 py-1 border-b border-green-900">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-700 text-xs ml-2">EVM CONSOLE — CHAINOFCOMMAND</span>
        </div>
        <button
          onClick={onClear}
          className="text-green-900 hover:text-green-600 text-xs border border-green-950 hover:border-green-800 px-2 py-0.5 rounded transition-all"
        >
          CLEAR
        </button>
      </div>

      <div className="p-3 h-48 overflow-y-auto space-y-1">
        {logs.length === 0 && (
          <div className="text-green-900 text-xs">
            <span className="text-green-700">$</span> awaiting contract interactions...
          </div>
        )}

        {logs.map((log, i) => {
          const color = LOG_COLORS[log.type] || LOG_COLORS.INFO;
          const prefix =
            log.type === "REVERT" ? "✗ REVERT" :
              log.type === "SUCCESS" ? "✓ SUCCESS" :
                log.type === "PENDING" ? "⏳ PENDING" :
                  log.type === "ERROR" ? "⚠ ERROR" :
                    "ℹ INFO";

          return (
            <div key={i} className={`text-xs ${color} leading-relaxed`}>
              <span className="text-green-800 select-none">
                [{new Date().toTimeString().slice(0, 8)}]
              </span>{" "}
              <span className="font-bold">{prefix}:</span>{" "}
              <span className={log.type === "REVERT" ? "bg-red-900/30 px-1 rounded" : ""}>
                {log.message}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
