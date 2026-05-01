"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContracts } from "../../lib/contracts";
import QRGenerator from "../../components/QRGenerator";
import EVMConsole from "../../components/EVMConsole";

export default function RegistryPage() {
  const router = useRouter();
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ manufacturer: "", status: "all", compromised: "all" });
  const [revocationAddress, setRevocationAddress] = useState("");
  const [revocationStatus, setRevocationStatus] = useState("idle");
  const [consoleLogs, setConsoleLogs] = useState([]);
  const role = typeof window !== "undefined" ? sessionStorage.getItem("coc_role") : "";

  useEffect(() => {
    loadComponents();
  }, []);

  function addLog(type, message) {
    setConsoleLogs((prev) => [...prev, { type, message }]);
  }

  async function loadComponents() {
    try {
      addLog("PENDING", "Loading ComponentRegistry...");
      const { componentRegistry } = await getContracts();
      const total = await componentRegistry.getTotalComponents();
      addLog("INFO", `Total components: ${total.toString()}`);

      const loaded = [];
      for (let i = 0; i < Math.min(Number(total), 50); i++) {
        try {
          const compId = await componentRegistry.allComponentIds(i);
          const [comp] = await componentRegistry.getFullHistory(compId);
          loaded.push({
            componentId: compId,
            componentType: comp.componentType,
            manufacturer: comp.manufacturer,
            currentOwner: comp.currentOwner,
            categoryLevel: Number(comp.categoryLevel),
            value: comp.value?.toString(),
            verified: comp.verified,
            compromised: comp.compromised,
          });
        } catch { }
      }

      setComponents(loaded);
      addLog("SUCCESS", `Loaded ${loaded.length} components from registry`);
    } catch (err) {
      addLog("ERROR", "Failed to load registry: " + err.message);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecursiveRevocation() {
    if (!revocationAddress) return;
    try {
      setRevocationStatus("loading");
      addLog("PENDING", `Recursive revocation: ${revocationAddress}`);
      const { componentRegistry } = await getContracts(true);
      const tx = await componentRegistry.recursiveRevocation(revocationAddress);
      await tx.wait();
      addLog("SUCCESS", "Recursive revocation complete");
      setRevocationStatus("done");
      loadComponents();
    } catch (err) {
      addLog("REVERT", err.message);
      setRevocationStatus("error");
    }
  }

  const filtered = components.filter((c) => {
    if (filters.manufacturer && !c.manufacturer?.toLowerCase().includes(filters.manufacturer.toLowerCase())) return false;
    if (filters.status === "verified" && !c.verified) return false;
    if (filters.status === "unverified" && c.verified) return false;
    if (filters.compromised === "yes" && !c.compromised) return false;
    if (filters.compromised === "no" && c.compromised) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-green-900 pb-3">
          <div>
            <div className="text-green-600 text-xs tracking-widest">CHAINOFCOMMAND</div>
            <h1 className="text-xl font-bold tracking-widest">COMPONENT REGISTRY</h1>
          </div>
          <button onClick={() => router.back()} className="border border-green-800 text-green-600 text-xs px-3 py-1 rounded">← BACK</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <input
            className="bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded font-mono placeholder-green-900"
            placeholder="FILTER MANUFACTURER..."
            value={filters.manufacturer}
            onChange={(e) => setFilters((f) => ({ ...f, manufacturer: e.target.value }))}
          />
          <select
            className="bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">ALL STATUS</option>
            <option value="verified">VERIFIED ONLY</option>
            <option value="unverified">UNVERIFIED ONLY</option>
          </select>
          <select
            className="bg-black border border-green-800 text-green-400 text-xs p-1.5 rounded"
            value={filters.compromised}
            onChange={(e) => setFilters((f) => ({ ...f, compromised: e.target.value }))}
          >
            <option value="all">ALL COMPROMISE STATUS</option>
            <option value="yes">COMPROMISED ONLY</option>
            <option value="no">CLEAN ONLY</option>
          </select>
        </div>

        {(role === "COMMANDER" || role === "commander") && (
          <div className="border border-orange-900 rounded bg-gray-950 p-3 mb-4">
            <div className="text-orange-600 text-xs tracking-widest mb-2">COMMANDER: RECURSIVE REVOCATION</div>
            <div className="flex gap-2">
              <input
                value={revocationAddress}
                onChange={(e) => setRevocationAddress(e.target.value)}
                placeholder="MANUFACTURER ADDRESS TO REVOKE..."
                className="flex-1 bg-black border border-orange-900 text-orange-400 text-xs p-1.5 rounded font-mono placeholder-orange-900"
              />
              <button
                onClick={handleRecursiveRevocation}
                disabled={!revocationAddress || revocationStatus === "loading"}
                className="border border-orange-600 text-orange-400 hover:bg-orange-900/10 disabled:opacity-40 text-xs px-3 py-1 rounded font-bold"
              >
                {revocationStatus === "loading" ? "REVOKING..." : "TRIGGER"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            {loading ? (
              <div className="text-green-700 text-xs animate-pulse text-center py-8">LOADING REGISTRY...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-green-600 border-b border-green-900">
                      <th className="text-left p-2">COMPONENT ID</th>
                      <th className="text-left p-2">TYPE</th>
                      <th className="text-left p-2">MANUFACTURER</th>
                      <th className="text-left p-2">OWNER</th>
                      <th className="text-left p-2">STATUS</th>
                      <th className="text-left p-2">COMPROMISED</th>
                      <th className="text-left p-2">QR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-green-900 py-4">NO COMPONENTS MATCH FILTER</td></tr>
                    )}
                    {filtered.map((comp, i) => (
                      <tr
                        key={i}
                        className={`border-b border-green-950 hover:bg-green-900/10 cursor-pointer transition-all ${selectedComponent?.componentId === comp.componentId ? "bg-green-900/20" : ""
                          } ${comp.compromised ? "border-l-2 border-l-red-600" : ""}`}
                        onClick={() => setSelectedComponent(comp)}
                      >
                        <td className="p-2 text-green-600">{comp.componentId?.slice(0, 10)}...</td>
                        <td className="p-2 text-green-400">{comp.componentType}</td>
                        <td className="p-2 text-green-600">{comp.manufacturer?.slice(0, 10)}...</td>
                        <td className="p-2 text-green-600">{comp.currentOwner?.slice(0, 10)}...</td>
                        <td className={`p-2 font-bold ${comp.verified ? "text-green-400" : "text-red-400"}`}>
                          {comp.verified ? "✓ VERIFIED" : "⚠ UNVERIFIED"}
                        </td>
                        <td className={`p-2 font-bold ${comp.compromised ? "text-red-400" : "text-green-700"}`}>
                          {comp.compromised ? "⚠ YES" : "CLEAN"}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedComponent(comp); }}
                            className="text-green-700 hover:text-green-400 border border-green-900 hover:border-green-700 px-1 py-0.5 rounded text-xs"
                          >
                            QR
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            {selectedComponent ? (
              <div className="sticky top-4">
                <QRGenerator
                  componentId={selectedComponent.componentId?.toString() || ""}
                  componentName={selectedComponent.componentType}
                />
                <div className="mt-2 border border-green-900 rounded p-2 text-xs text-green-700">
                  <div>CAT LEVEL: {selectedComponent.categoryLevel}</div>
                  <div className="break-all mt-1">FULL ID: {selectedComponent.componentId}</div>
                </div>
              </div>
            ) : (
              <div className="border border-green-900 rounded p-4 text-center text-green-900 text-xs">
                SELECT A COMPONENT TO VIEW QR
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <EVMConsole logs={consoleLogs} onClear={() => setConsoleLogs([])} />
        </div>
      </div>
    </div>
  );
}
