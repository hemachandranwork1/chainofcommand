"use client";
import { useState } from "react";
import { fireChaff, getChaffStats } from "../lib/chaffGenerator";

const EXPLORER = "https://amoy.polygonscan.com/tx/";

export default function ChaffModeButton({ realTransaction, onChaffFired }) {
  const [status, setStatus] = useState("idle");
  const [batch, setBatch] = useState([]);
  const [stats, setStats] = useState(null);

  function handleActivate() {
    if (!realTransaction) return;
    setStatus("active");
    const result = fireChaff(realTransaction, 3);
    const s = getChaffStats();
    setBatch(result);
    setStats(s);
    onChaffFired?.(result);
    setTimeout(() => setStatus("idle"), 10000);
  }

  return (
    <div className="chaff-mode font-mono border border-green-800 rounded p-3 bg-gray-950">
      <div className="flex items-center justify-between mb-2">
        <div className="text-green-400 text-xs font-bold tracking-widest">
          TRAFFIC OBFUSCATION
        </div>
        {status === "active" && (
          <span className="text-green-400 text-xs border border-green-600 px-2 py-0.5 rounded animate-pulse">
            CHAFF ACTIVE
          </span>
        )}
      </div>

      <div className="text-green-700 text-xs mb-3">
        Fires identical-size dummy transactions alongside real procurement.
        Enemy cannot distinguish signal from noise via traffic analysis.
      </div>

      <button
        onClick={handleActivate}
        disabled={!realTransaction || status === "active"}
        className="w-full border border-green-600 text-green-400 hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs py-2 rounded transition-all font-bold tracking-widest"
      >
        {status === "active" ? "TRAFFIC OBFUSCATION ACTIVE" : "ACTIVATE CHAFF MODE"}
      </button>

      {stats && (
        <div className="mt-2 text-xs text-green-700">
          TOTAL: {stats.totalTransactions} TX |
          REAL: {stats.realCount} |
          CHAFF: {stats.chaffCount} |
          IDENTICAL SIZE: {stats.allIdenticalSize ? "✓ YES" : "✗ NO"}
        </div>
      )}

      {batch.length > 0 && (
        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          <div className="text-green-600 text-xs mb-1">TRANSACTION BATCH:</div>
          {batch.map((tx, i) => (
            <div
              key={i}
              className={`border rounded p-1.5 text-xs ${!tx.isChaff
                ? "border-green-700 bg-green-900/10"
                : "border-green-900 bg-gray-900/30"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className={!tx.isChaff ? "text-green-400 font-bold" : "text-green-800"}>
                  {!tx.isChaff ? "▶ REAL TX" : `◦ CHAFF ${i}`}
                </span>
                <span className="text-green-700">{tx.byteSize} bytes</span>
              </div>
              <div className="text-green-800 break-all mt-0.5">
                {tx.mockTxHash?.slice(0, 20)}...
              </div>
              <a
                href={`${EXPLORER}${tx.mockTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:text-green-500 text-xs underline"
              >
                VIEW ON EXPLORER ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
