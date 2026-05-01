"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContracts } from "../../../lib/contracts";
import ThreatDashboard from "../../../components/ThreatDashboard";
import HoneyTokenAlert from "../../../components/HoneyTokenAlert";
import GovernanceVote from "../../../components/GovernanceVote";
import RecursiveRevocationGraph from "../../../components/RecursiveRevocationGraph";
import { getHoneyTokenAlert, clearHoneyTokens } from "../../../lib/honeyToken";

export default function CommanderDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [honeyAlert, setHoneyAlert] = useState(null);
  const [circuitBreakerPaused, setCircuitBreakerPaused] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [revocationAddress, setRevocationAddress] = useState("");
  const [revocationComponents, setRevocationComponents] = useState([]);
  const [revocationTriggered, setRevocationTriggered] = useState(false);
  const [revocationStatus, setRevocationStatus] = useState("idle");
  const [loading, setLoading] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState([]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      const alert = getHoneyTokenAlert();
      if (alert) setHoneyAlert(alert);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  function addLog(type, message) {
    setConsoleLogs((prev) => [...prev, { type, message, time: Date.now() }]);
  }

  async function loadAll() {
    try {
      const { auditLog, circuitBreaker, componentRegistry } = await getContracts();

      const filter = auditLog.filters.LogEntryAdded();
      const rawEvents = await auditLog.queryFilter(filter, -1000);
      const parsed = rawEvents.map((e) => ({
        eventType: e.args.eventType,
        actor: e.args.actor,
        componentId: e.args.componentId,
        timestamp: Number(e.args.timestamp),
        blockNumber: Number(e.blockNumber),
        outcome: e.args.outcome,
        denialReason: e.args.denialReason,
        anomalyFlags: e.args.anomalyFlags || [],
        rootHash: e.args.rootHash,
      }));
      setEvents(parsed);
      addLog("SUCCESS", `Loaded ${parsed.length} audit events`);

      const paused = await circuitBreaker.isPaused();
      setCircuitBreakerPaused(paused);
      addLog("INFO", `Circuit breaker status: ${paused ? "PAUSED" : "ACTIVE"}`);

      const total = await componentRegistry.getTotalComponents();
      addLog("INFO", `Total components in registry: ${total.toString()}`);
    } catch (err) {
      addLog("ERROR", err.message || "Failed to load commander data");
    } finally {
      setLoading(false);
    }
  }

  async function loadProposals() {
    try {
      const { governanceMultiSig } = await getContracts();
      const count = await governanceMultiSig.proposalCount();
      const loaded = [];
      for (let i = 0; i < Math.min(Number(count), 20); i++) {
        try {
          const p = await governanceMultiSig.proposals(i);
          loaded.push({
            id: i,
            actionType: Number(p.actionType),
            proposer: p.proposer,
            targetAddress: p.targetAddress,
            clearanceLevel: Number(p.clearanceLevel),
            voteCount: Number(p.voteCount),
            status: Number(p.status),
          });
        } catch { }
      }
      setProposals(loaded.filter((p) => p.status === 0));
    } catch (err) {
      addLog("ERROR", "Failed to load proposals: " + err.message);
    }
  }

  async function handleRecursiveRevocation() {
    if (!revocationAddress) return;
    try {
      setRevocationStatus("loading");
      addLog("PENDING", `Triggering recursive revocation for ${revocationAddress}`);
      const { componentRegistry } = await getContracts(true);
      const components = await componentRegistry.getManufacturerComponents(revocationAddress);
      const componentData = components.map((id, i) => ({
        componentId: id,
        componentType: `COMPONENT ${i + 1}`,
      }));
      setRevocationComponents(componentData);
      const tx = await componentRegistry.recursiveRevocation(revocationAddress);
      await tx.wait();
      setRevocationTriggered(true);
      addLog("SUCCESS", `Recursive revocation complete. ${components.length} components flagged.`);
      setRevocationStatus("done");
    } catch (err) {
      addLog("REVERT", err.message || "Revocation failed");
      setRevocationStatus("error");
    }
  }

  async function handleCircuitBreakerProposal(action) {
    try {
      addLog("PENDING", `Proposing circuit breaker ${action}...`);
      const { governanceMultiSig } = await getContracts(true);
      const actionType = action === "PAUSE" ? 3 : 4;
      const tx = await governanceMultiSig.proposeAction(
        actionType, "0x0000000000000000000000000000000000000000", 0, 0, "", ""
      );
      await tx.wait();
      addLog("SUCCESS", `Circuit breaker ${action} proposal created. Requires 2-of-3 vote.`);
      loadProposals();
    } catch (err) {
      addLog("REVERT", err.message || "Proposal failed");
    }
  }

  function handleDismissHoneyAlert() {
    addLog("INFO", `Honey-token alert dismissed by COMMANDER at ${new Date().toISOString()}`);
    clearHoneyTokens();
    setHoneyAlert(null);
  }

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-green-900 pb-3">
          <div>
            <div className="text-green-600 text-xs tracking-widest">CHAINOFCOMMAND</div>
            <h1 className="text-xl font-bold tracking-widest">COMMANDER DASHBOARD</h1>
            <div className="text-green-700 text-xs">CLEARANCE LEVEL 4 — FULL SYSTEM ACCESS</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/governance")} className="border border-blue-700 text-blue-400 hover:bg-blue-900/10 text-xs px-3 py-1 rounded">GOVERNANCE</button>
            <button onClick={() => router.push("/registry")} className="border border-green-800 text-green-600 hover:bg-green-900/10 text-xs px-3 py-1 rounded">REGISTRY</button>
            <button onClick={() => { sessionStorage.clear(); router.push("/login"); }} className="border border-red-900 text-red-700 text-xs px-3 py-1 rounded">LOGOUT</button>
          </div>
        </div>

        {honeyAlert && (
          <div className="mb-4">
            <HoneyTokenAlert alert={honeyAlert} onDismiss={handleDismissHoneyAlert} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="border border-green-800 rounded bg-gray-950 p-3">
            <div className="text-green-600 text-xs tracking-widest mb-2">CIRCUIT BREAKER</div>
            <div className={`text-lg font-bold mb-2 ${circuitBreakerPaused ? "text-red-400" : "text-green-400"}`}>
              {circuitBreakerPaused ? "⚠ PAUSED" : "● ACTIVE"}
            </div>
            <div className="text-green-800 text-xs mb-3">
              All critical actions require 2-of-3 governance vote
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCircuitBreakerProposal("PAUSE")}
                disabled={circuitBreakerPaused}
                className="border border-red-700 text-red-400 hover:bg-red-900/10 disabled:opacity-40 text-xs px-2 py-1 rounded flex-1"
              >
                PROPOSE PAUSE
              </button>
              <button
                onClick={() => handleCircuitBreakerProposal("UNPAUSE")}
                disabled={!circuitBreakerPaused}
                className="border border-green-700 text-green-400 hover:bg-green-900/10 disabled:opacity-40 text-xs px-2 py-1 rounded flex-1"
              >
                PROPOSE UNPAUSE
              </button>
            </div>
          </div>

          <div className="border border-orange-900 rounded bg-gray-950 p-3">
            <div className="text-orange-600 text-xs tracking-widest mb-2">RECURSIVE REVOCATION</div>
            <input
              value={revocationAddress}
              onChange={(e) => setRevocationAddress(e.target.value)}
              placeholder="MANUFACTURER ADDRESS..."
              className="w-full bg-black border border-orange-900 text-orange-400 text-xs p-1.5 rounded font-mono placeholder-orange-900 mb-2 focus:outline-none focus:border-orange-600"
            />
            <button
              onClick={handleRecursiveRevocation}
              disabled={!revocationAddress || revocationStatus === "loading"}
              className="w-full border border-orange-600 text-orange-400 hover:bg-orange-900/10 disabled:opacity-40 text-xs py-1.5 rounded font-bold"
            >
              {revocationStatus === "loading" ? "REVOKING..." : "TRIGGER REVOCATION"}
            </button>
            {revocationStatus === "done" && (
              <div className="text-orange-400 text-xs mt-1">
                ✓ {revocationComponents.length} COMPONENTS FLAGGED
              </div>
            )}
          </div>

          <div className="border border-green-800 rounded bg-gray-950 p-3">
            <div className="text-green-600 text-xs tracking-widest mb-2">SYSTEM SUMMARY</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-green-700">TOTAL EVENTS:</span>
                <span className="text-green-400">{events.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">BLOCKED:</span>
                <span className="text-red-400">{events.filter((e) => e.outcome === "DENIED").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">APPROVED:</span>
                <span className="text-green-400">{events.filter((e) => e.outcome === "APPROVED").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">HONEY ALERTS:</span>
                <span className="text-purple-400">{honeyAlert ? "1 ACTIVE" : "NONE"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <ThreatDashboard events={events} />
        </div>

        {revocationComponents.length > 0 && (
          <div className="mb-4">
            <RecursiveRevocationGraph
              manufacturerAddress={revocationAddress}
              components={revocationComponents}
              revocationTriggered={revocationTriggered}
            />
          </div>
        )}

        <div className="mb-4">
          <div className="text-green-600 text-xs tracking-widest mb-2">ACTIVE GOVERNANCE PROPOSALS</div>
          <button onClick={loadProposals} className="border border-green-800 text-green-600 text-xs px-3 py-1 rounded mb-2">
            LOAD PROPOSALS
          </button>
          <GovernanceVote proposals={proposals} currentRole="COMMANDER" onVote={() => loadProposals()} />
        </div>

        <div className="border border-green-900 rounded bg-black p-3">
          <div className="text-green-700 text-xs tracking-widest mb-2">COMMANDER CONSOLE</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {consoleLogs.map((log, i) => (
              <div key={i} className={`text-xs ${log.type === "SUCCESS" ? "text-green-400" :
                  log.type === "REVERT" ? "text-red-400" :
                    log.type === "PENDING" ? "text-yellow-400" : "text-green-700"
                }`}>
                [{new Date(log.time).toTimeString().slice(0, 8)}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
