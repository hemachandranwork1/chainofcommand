"use client";
import { useState } from "react";
import { generateProofPDF, downloadProofPDF } from "../lib/proofGenerator";

const POLYGON_EXPLORER = "https://amoy.polygonscan.com/tx/";

export default function ProofExport({ auditEvent, role }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  if (role !== "AUDITOR" && role !== "auditor") {
    return (
      <div className="font-mono text-xs text-green-900 border border-green-950 rounded p-2 text-center">
        PROOF EXPORT — AUDITOR ROLE REQUIRED
      </div>
    );
  }

  if (!auditEvent) {
    return (
      <div className="font-mono text-xs text-green-800 border border-green-900 rounded p-2 text-center">
        SELECT AN AUDIT ENTRY TO EXPORT PROOF
      </div>
    );
  }

  async function handleExport() {
    try {
      setStatus("generating");
      setError(null);
      const blob = await generateProofPDF(auditEvent);
      const filename = `coc-proof-${auditEvent.transactionHash?.slice(0, 8) || Date.now()}.pdf`;
      downloadProofPDF(blob, filename);
      setStatus("success");
    } catch (err) {
      setError(err.message || "PDF generation failed");
      setStatus("error");
    }
  }

  return (
    <div className="proof-export font-mono border border-green-800 rounded p-3 bg-gray-950">
      <div className="text-green-400 text-xs font-bold tracking-widest mb-2">
        CRYPTOGRAPHIC PROOF EXPORT
      </div>

      <div className="text-green-700 text-xs mb-3">
        Event: {auditEvent.eventType || "PROCUREMENT_EVENT"} |
        Outcome: <span className={auditEvent.outcome === "APPROVED" ? "text-green-400" : "text-red-400"}>
          {auditEvent.outcome}
        </span>
      </div>

      <button
        onClick={handleExport}
        disabled={status === "generating"}
        className="w-full border border-green-600 text-green-400 hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs py-2 px-3 rounded transition-all font-mono font-bold tracking-widest"
      >
        {status === "generating" ? "GENERATING PROOF..." : "EXPORT CRYPTOGRAPHIC PROOF PDF"}
      </button>

      {status === "generating" && (
        <div className="mt-2 text-green-600 text-xs animate-pulse text-center">
          COMPILING BLOCKCHAIN EVIDENCE... GENERATING PDF...
        </div>
      )}

      {status === "success" && (
        <div className="mt-2 border border-green-600 bg-green-900/20 rounded p-2">
          <div className="text-green-400 text-xs font-bold">✓ PROOF GENERATED</div>
          {auditEvent.transactionHash && (
            <>
              <div className="text-green-600 text-xs mt-1 break-all">
                TX: {auditEvent.transactionHash}
              </div>
              <a
                href={`${POLYGON_EXPLORER}${auditEvent.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 text-xs underline hover:text-green-300"
              >
                VERIFY ON POLYGON SEPOLIA EXPLORER ↗
              </a>
            </>
          )}
          <div className="text-green-700 text-xs mt-1">
            This PDF is court-admissible evidence. Verifiable by anyone with internet access.
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-2 border border-red-600 bg-red-900/20 rounded p-2">
          <div className="text-red-400 text-xs font-bold">⚠ EXPORT FAILED</div>
          <div className="text-red-300 text-xs">{error}</div>
          <button onClick={() => setStatus("idle")} className="text-red-400 text-xs underline mt-1">
            RETRY
          </button>
        </div>
      )}
    </div>
  );
}
