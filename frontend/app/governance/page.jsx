"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContracts } from "../../lib/contracts";
import GovernanceVote from "../../components/GovernanceVote";
import EVMConsole from "../../components/EVMConsole";

const ACTION_TYPES = [
  { value: 0, label: "REGISTER SOLDIER" },
  { value: 1, label: "REVOKE SOLDIER" },
  { value: 2, label: "UPDATE CLEARANCE" },
  { value: 3, label: "PAUSE SYSTEM" },
  { value: 4, label: "UNPAUSE SYSTEM" },
];

export default function GovernancePage() {
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [history, setHistory] = useState([]);
  const [circuitBreakerPaused, setCircuitBreakerPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [form, setForm] = useState({ actionType: 0, targetAddress: "", clearanceLevel: 0, rank: 0, didReference: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const role = typeof window !== "undefined" ? sessionStorage.getItem("coc_role") : "";

  const canPropose = ["COMMANDER", "AUDITOR", "PROCUREMENT_COMMAND", "commander", "auditor"].includes(role);

  useEffect(() => {
    loadAll();
  }, []);

  function addLog(type, message) {
    setConsoleLogs((prev) => [...prev, { type, message }]);
  }

  async function loadAll() {
    try {
      const { governanceMultiSig, circuitBreaker } = await getContracts();

      const paused = await circuitBreaker.isPaused();
      setCircuitBreakerPaused(paused);
      addLog("INFO", `Circuit breaker: ${paused ? "PAUSED" : "ACTIVE"}`);

      const count = await governanceMultiSig.proposalCount();
      addLog("INFO", `Total proposals: ${count.toString()}`);

      const allProposals = [];
      for (let i = 0; i < Math.min(Number(count), 30); i++) {
        try {
          const p = await governanceMultiSig.proposals(i);
          allProposals.push({
            id: i,
            actionType: Number(p.actionType),
            proposer: p.proposer,
            targetAddress: p.targetAddress,
            clearanceLevel: Number(p.clearanceLevel),
            rank: Number(p.rank),
            didReference: p.didReference,
            reason: p.reason,
            voteCount: Number(p.voteCount),
            status: Number(p.status),
          });
        } catch { }
      }

      setProposals(allProposals.filter((p) => p.status === 0));
      setHistory(allProposals.filter((p) => p.status !== 0));
      addLog("SUCCESS", `Loaded ${allProposals.length} proposals`);
    } catch (err) {
      addLog("ERROR", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePropose(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      addLog("PENDING", `Proposing action type ${form.actionType}...`);
      const { governanceMultiSig } = await getContracts(true);
      const tx = await governanceMultiSig.proposeAction(
        form.actionType,
        form.targetAddress || "0x0000000000000000000000000000000000000000",
        form.clearanceLevel,
        form.rank,
        form.didReference,
        form.reason
      );
      const receipt = await tx.wait();
      addLog("SUCCESS", `Proposal created. TX: ${receipt.hash}`);
      loadAll();
    } catch (err) {
      addLog("REVERT", err.message || "Proposal failed");
    } finally {
      setSubmitting(false);
    }
  }

  const STATUS_LABELS = ["PENDING", "EXECUTED", "REVOKED", "EXPIRED"];

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-green-900 pb-3">
          <div>
            <div className="text-green-600 text-xs tracking-widest">CHAINOFCOMMAND</div>
            <h1 className="text-xl font-bold tracking-widest">GOVERNANCE MULTISIG</h1>
            <div className="text-blue-600 text-xs">2-OF-3 REQUIRED — NO UNILATERAL POWER AT ANY LEVEL</div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAll} className="border border-green-700 text-green-400 text-xs px-3 py-1 rounded">↻ REFRESH</button>
            <button onClick={() => router.back()} className="border border-green-800 text-green-600 text-xs px-3 py-1 rounded">← BACK</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`border rounded p-3 text-center ${circuitBreakerPaused ? "border-red-700" : "border-green-700"}`}>
            <div className={`text-lg font-bold ${circuitBreakerPaused ? "text-red-400" : "text-green-400"}`}>
              {circuitBreakerPaused ? "PAUSED" : "ACTIVE"}
            </div>
            <div className="text-green-700 text-xs">CIRCUIT BREAKER</div>
          </div>
          <div className="border border-blue-900 rounded p-3 text-center">
            <div className="text-blue-400 text-lg font-bold">{proposals.length}</div>
            <div className="text-green-700 text-xs">PENDING PROPOSALS</div>
          </div>
          <div className="border border-green-900 rounded p-3 text-center">
            <div className="text-green-400 text-lg font-bold">{history.length}</div>
            <div className="text-green-700 text-xs">HISTORICAL</div>
          </div>
        </div>

        {canPropose && (
          <div className="border border-blue-900 rounded bg-gray-950 p-4 mb-4">
            <div className="text-blue-400 text-xs tracking-widest font-bold mb-3">CREATE NEW PROPOSAL</div>
            <form onSubmit={handlePropose} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-green-700 text-xs block mb-1">ACTION TYPE</label>
                  <select
                    value={form.actionType}
                    onChange={(e) => setForm((f) => ({ ...f, actionType: Number(e.target.value) }))}
                    className="w-full bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-green-700 text-xs block mb-1">TARGET ADDRESS</label>
                  <input
                    value={form.targetAddress}
                    onChange={(e) => setForm((f) => ({ ...f, targetAddress: e.target.value }))}
                    placeholder="0x..."
                    className="w-full bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded font-mono placeholder-green-900"
                  />
                </div>
                {[0, 2].includes(form.actionType) && (
                  <>
                    <div>
                      <label className="text-green-700 text-xs block mb-1">CLEARANCE LEVEL (1-5)</label>
                      <input
                        type="number" min={1} max={5}
                        value={form.clearanceLevel}
                        onChange={(e) => setForm((f) => ({ ...f, clearanceLevel: Number(e.target.value) }))}
                        className="w-full bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-green-700 text-xs block mb-1">RANK (0-4)</label>
                      <input
                        type="number" min={0} max={4}
                        value={form.rank}
                        onChange={(e) => setForm((f) => ({ ...f, rank: Number(e.target.value) }))}
                        className="w-full bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded"
                      />
                    </div>
                  </>
                )}
              </div>
              {form.actionType === 0 && (
                <div>
                  <label className="text-green-700 text-xs block mb-1">DID REFERENCE</label>
                  <input
                    value={form.didReference}
                    onChange={(e) => setForm((f) => ({ ...f, didReference: e.target.value }))}
                    placeholder="did:example:..."
                    className="w-full bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded font-mono placeholder-green-900"
                  />
                </div>
              )}
              <div>
                <label className="text-green-700 text-xs block mb-1">REASON</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for proposal..."
                  className="w-full bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded placeholder-green-900"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full border border-blue-600 text-blue-400 hover:bg-blue-900/10 disabled:opacity-50 text-xs py-2 rounded font-bold"
              >
                {submitting ? "SUBMITTING PROPOSAL..." : "CREATE PROPOSAL (REQUIRES 2-OF-3 VOTES TO EXECUTE)"}
              </button>
            </form>
          </div>
        )}

        <div className="mb-4">
          <GovernanceVote proposals={proposals} currentRole={role} onVote={loadAll} />
        </div>

        {history.length > 0 && (
          <div className="mb-4 border border-green-900 rounded bg-gray-950 p-3">
            <div className="text-green-600 text-xs tracking-widest mb-2">PROPOSAL HISTORY</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((p) => (
                <div key={p.id} className="border border-green-950 rounded p-2 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-green-600">{ACTION_TYPES.find((a) => a.value === p.actionType)?.label || "UNKNOWN"}</span>
                    <span className="text-green-800 ml-2">{p.targetAddress?.slice(0, 10)}...</span>
                  </div>
                  <span className={`border px-2 py-0.5 rounded text-xs ${p.status === 1 ? "border-green-700 text-green-400" :
                      p.status === 2 ? "border-red-700 text-red-400" :
                        "border-gray-700 text-gray-500"
                    }`}>
                    {STATUS_LABELS[p.status] || "UNKNOWN"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <EVMConsole logs={consoleLogs} onClear={() => setConsoleLogs([])} />
      </div>
    </div>
  );
}
