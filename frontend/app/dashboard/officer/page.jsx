"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContracts } from "../../../lib/contracts";
import ThreatDashboard from "../../../components/ThreatDashboard";
import AnomalyBadge from "../../../components/AnomalyBadge";

export default function OfficerDashboard() {
  const router = useRouter();
  const [identity, setIdentity] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [address, setAddress] = useState("");
  const [anomalies, setAnomalies] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const RANK_LABELS = ["SOLDIER", "JUNIOR OFFICER", "PROCUREMENT OFFICER", "COMMANDER", "AUDITOR"];

  useEffect(() => {
    const storedRole = sessionStorage.getItem("coc_role") || "PROCUREMENT_OFFICER";
    const storedAddress = sessionStorage.getItem("coc_address") || "";
    setRole(storedRole);
    setAddress(storedAddress);
    loadIdentity(storedAddress);
    loadEvents(storedAddress);
  }, []);

  async function loadIdentity(addr) {
    if (!addr) { setLoading(false); return; }
    try {
      const { identityRegistry } = await getContracts();
      const isActive = await identityRegistry.isActive(addr);
      if (isActive) {
        const data = await identityRegistry.getSoldier(addr);
        const flagged = await identityRegistry.isAnomalyFlagged(addr);
        setIdentity({
          address: addr,
          rank: RANK_LABELS[Number(data.rank)] || "UNKNOWN",
          clearanceLevel: Number(data.clearanceLevel),
          active: data.active,
          registrationTimestamp: Number(data.registrationTimestamp),
          didReference: data.didReference,
        });
        if (flagged) setAnomalies(["ANOMALY_FLAGGED"]);
      } else {
        setIdentity({ address: addr, rank: "UNREGISTERED", clearanceLevel: 0, active: false });
      }
    } catch (err) {
      setIdentity({ address: addr, rank: "DEMO MODE", clearanceLevel: 3, active: true });
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(addr) {
    try {
      const { auditLog } = await getContracts();
      const filter = auditLog.filters.LogEntryAdded();
      const rawEvents = await auditLog.queryFilter(filter, -1000);
      const parsed = rawEvents
        .filter((e) => !addr || e.args?.actor?.toLowerCase() === addr.toLowerCase())
        .map((e) => ({
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
    } catch {
      setEvents([]);
    }
  }

  const approvedCount = events.filter((e) => e.outcome === "APPROVED").length;
  const deniedCount = events.filter((e) => e.outcome === "DENIED").length;

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-green-900 pb-3">
          <div>
            <div className="text-green-600 text-xs tracking-widest">CHAINOFCOMMAND</div>
            <h1 className="text-xl font-bold tracking-widest">OFFICER DASHBOARD</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/procurement")}
              className="border border-green-600 text-green-400 hover:bg-green-900/20 text-xs px-3 py-1 rounded transition-all font-bold"
            >
              ▶ PROCUREMENT
            </button>
            <button
              onClick={() => router.push("/registry")}
              className="border border-green-800 text-green-600 hover:bg-green-900/10 text-xs px-3 py-1 rounded transition-all"
            >
              REGISTRY
            </button>
            <button
              onClick={() => { sessionStorage.clear(); router.push("/login"); }}
              className="border border-red-900 text-red-700 hover:bg-red-900/10 text-xs px-3 py-1 rounded transition-all"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-green-700 text-xs animate-pulse text-center py-8">
            LOADING IDENTITY FROM BLOCKCHAIN...
          </div>
        ) : (
          <>
            <div className="border border-green-800 rounded bg-gray-950 p-4 mb-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">
                IDENTITY RECORD — BLOCKCHAIN VERIFIED
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["ADDRESS", identity?.address?.slice(0, 14) + "..." || "—"],
                  ["RANK", identity?.rank || "—"],
                  ["CLEARANCE", `LEVEL ${identity?.clearanceLevel || 0}`],
                  ["STATUS", identity?.active ? "ACTIVE" : "INACTIVE"],
                ].map(([label, value]) => (
                  <div key={label} className="border border-green-900 rounded p-2 text-center">
                    <div className="text-green-700 text-xs">{label}</div>
                    <div className={`text-xs font-bold mt-1 ${label === "STATUS"
                        ? identity?.active ? "text-green-400" : "text-red-400"
                        : "text-green-400"
                      }`}>{value}</div>
                  </div>
                ))}
              </div>

              {anomalies.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-orange-400 text-xs font-bold">ACTIVE FLAGS:</span>
                  <AnomalyBadge anomalies={anomalies} />
                </div>
              )}

              {identity?.didReference && (
                <div className="mt-2 text-green-800 text-xs">
                  DID: {identity.didReference}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                ["APPROVED", approvedCount, "text-green-400 border-green-700"],
                ["DENIED", deniedCount, "text-red-400 border-red-700"],
                ["TOTAL EVENTS", events.length, "text-green-400 border-green-700"],
                ["ANOMALY FLAGS", anomalies.length, "text-orange-400 border-orange-700"],
              ].map(([label, value, color]) => (
                <div key={label} className={`border rounded p-2 text-center ${color}`}>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs tracking-widest">{label}</div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <ThreatDashboard events={events} />
            </div>

            <div className="border border-green-900 rounded bg-gray-950 p-3">
              <div className="text-green-600 text-xs tracking-widest mb-2">QUICK ACTIONS</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => router.push("/procurement")}
                  className="border border-green-600 text-green-400 hover:bg-green-900/20 text-xs px-4 py-2 rounded transition-all font-bold"
                >
                  NEW PROCUREMENT REQUEST
                </button>
                <button
                  onClick={() => router.push("/registry")}
                  className="border border-green-800 text-green-600 hover:bg-green-900/10 text-xs px-4 py-2 rounded transition-all"
                >
                  COMPONENT REGISTRY
                </button>
                <button
                  onClick={() => router.push("/audit-log")}
                  className="border border-green-800 text-green-600 hover:bg-green-900/10 text-xs px-4 py-2 rounded transition-all"
                >
                  AUDIT LOG
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
