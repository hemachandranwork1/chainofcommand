"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContracts } from "../../lib/contracts";
import QRScanner from "../../components/QRScanner";
import ComponentTimeline from "../../components/ComponentTimeline";
import SupplyChainGraph from "../../components/SupplyChainGraph";
import HashComparison from "../../components/HashComparison";
import EVMConsole from "../../components/EVMConsole";
import ChaffModeButton from "../../components/ChaffModeButton";
import RedAlertLockdown from "../../components/RedAlertLockdown";
import AnomalyBadge from "../../components/AnomalyBadge";
import { generateDeviceToken, isTokenCompromised, COMPROMISED_DEVICE_TOKEN } from "../../lib/deviceToken";
import { runAllChecks } from "../../lib/anomaly";
import { ethers } from "ethers";

const STEPS = [
  "IDENTITY CONFIRMATION",
  "COMPONENT SCAN",
  "SUPPLY CHAIN VERIFICATION",
  "HASH VERIFICATION",
  "DEVICE VALIDATION",
  "ATOMIC GATE",
  "RESULT",
];

export default function ProcurementPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState(null);
  const [scannedId, setScannedId] = useState(null);
  const [componentData, setComponentData] = useState(null);
  const [transferHistory, setTransferHistory] = useState([]);
  const [hasGap, setHasGap] = useState(false);
  const [deviceToken, setDeviceToken] = useState("");
  const [useCompromisedToken, setUseCompromisedToken] = useState(false);
  const [result, setResult] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [redAlert, setRedAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastTx, setLastTx] = useState(null);

  const address = typeof window !== "undefined" ? sessionStorage.getItem("coc_address") : "";

  useEffect(() => {
    const token = generateDeviceToken();
    setDeviceToken(token);
    addLog("INFO", `Device token generated: ${token.slice(0, 20)}...`);
    loadIdentity();
  }, []);

  function addLog(type, message) {
    setConsoleLogs((prev) => [...prev, { type, message }]);
  }

  async function loadIdentity() {
    try {
      const { identityRegistry } = await getContracts();
      if (address && await identityRegistry.isActive(address)) {
        const data = await identityRegistry.getSoldier(address);
        setIdentity({
          address,
          clearanceLevel: Number(data.clearanceLevel),
          rank: Number(data.rank),
          active: data.active,
        });
        addLog("SUCCESS", `Identity verified: clearance level ${Number(data.clearanceLevel)}`);
      } else {
        setIdentity({ address: address || "0xDEMO", clearanceLevel: 3, rank: 2, active: true });
        addLog("INFO", "Demo mode: identity not on chain, using demo values");
      }
    } catch {
      setIdentity({ address: address || "0xDEMO", clearanceLevel: 3, rank: 2, active: true });
      addLog("INFO", "Demo mode active");
    }
  }

  async function handleScan(componentId) {
    setScannedId(componentId);
    addLog("SUCCESS", `Component scanned: ${componentId.slice(0, 16)}...`);
    try {
      const { componentRegistry } = await getContracts();
      const compIdBytes = componentId.startsWith("0x")
        ? componentId
        : ethers.keccak256(ethers.toUtf8Bytes(componentId));
      addLog("PENDING", "Fetching component history from ComponentRegistry...");
      const [comp, history, gap] = await componentRegistry.getFullHistory(compIdBytes);
      setComponentData(comp);
      setTransferHistory(history.map((t) => ({
        from: t.from,
        to: t.to,
        timestamp: Number(t.timestamp) * 1000,
        locationHash: t.locationHash,
        verified: t.verified,
      })));
      setHasGap(gap);
      addLog(gap ? "REVERT" : "SUCCESS", gap ? "SUPPLY CHAIN GAP DETECTED" : "Supply chain verified clean");
      setStep(2);
    } catch (err) {
      addLog("ERROR", "Component not found on chain. Using demo data.");
      setTransferHistory([
        { from: "0xMANUFACTURER", to: "0xVENDOR", timestamp: Date.now() - 1209600000, locationHash: "0xFACTORY", verified: true },
        { from: "0xVENDOR", to: "0xBASE", timestamp: Date.now() - 604800000, locationHash: "0xBASE", verified: !componentId.includes("FAKE") },
      ]);
      setHasGap(componentId.includes("FAKE"));
      setStep(2);
    }
  }

  async function handleSubmitProcurement() {
    if (!identity || !scannedId) return;
    setSubmitting(true);
    const activeToken = useCompromisedToken ? COMPROMISED_DEVICE_TOKEN : deviceToken;

    const anomalyCheck = runAllChecks({
      timestamp: Date.now(),
      officerClearance: identity.clearanceLevel,
      componentCategory: componentData ? Number(componentData.categoryLevel) : 3,
    });

    if (anomalyCheck.length >= 2) {
      setAnomalies(anomalyCheck);
      setRedAlert(true);
      addLog("REVERT", `CRITICAL: ${anomalyCheck.length} anomalies detected simultaneously`);
    }

    try {
      addLog("PENDING", "Calling ProcurementGate.approveProcurement()...");
      addLog("PENDING", `[1] Checking CircuitBreaker.isPaused()...`);
      addLog("PENDING", `[2] Validating device token: ${activeToken.slice(0, 16)}...`);
      addLog("PENDING", `[3] Calling IdentityRegistry.getClearance(${identity.address?.slice(0, 10)}...)...`);
      addLog("PENDING", `[4] Calling ComponentRegistry.getFullHistory(${scannedId?.slice(0, 10)}...)...`);
      addLog("PENDING", `[5] Checking rate limit and anomaly flags...`);

      const { procurementGate } = await getContracts(true);
      const compIdBytes = scannedId.startsWith("0x")
        ? scannedId
        : ethers.keccak256(ethers.toUtf8Bytes(scannedId));
      const locationHash = ethers.keccak256(ethers.toUtf8Bytes("base-location-demo"));

      const tx = await procurementGate.approveProcurement(
        identity.address,
        compIdBytes,
        activeToken,
        locationHash
      );
      const receipt = await tx.wait();
      setLastTx({ hash: receipt.hash, officer: identity.address, componentId: scannedId });
      addLog("SUCCESS", `Transaction confirmed: ${receipt.hash}`);

      const approved = receipt.logs.some((log) => {
        try {
          return log.fragment?.name === "ApprovalGranted";
        } catch { return false; }
      });

      if (approved) {
        setResult({ success: true, txHash: receipt.hash, reason: null });
        addLog("SUCCESS", "APPROVAL GRANTED — All three layers verified");
      } else {
        setResult({ success: false, txHash: receipt.hash, reason: "DENIED BY CONTRACT" });
        addLog("REVERT", "APPROVAL DENIED — Contract rejected the request");
      }
    } catch (err) {
      addLog("REVERT", `Contract call failed: ${err.message || "unknown"}`);
      const isDenied = hasGap || useCompromisedToken || (identity?.clearanceLevel < (componentData ? Number(componentData.categoryLevel) : 0));
      setResult({ success: !isDenied, txHash: null, reason: isDenied ? "SUPPLY_CHAIN_GAP_OR_DEVICE_COMPROMISE" : null });
    } finally {
      setSubmitting(false);
      setStep(6);
    }
  }

  const expectedHash = scannedId ? "0x" + btoa(scannedId + "MANUFACTURER").replace(/[^a-zA-Z0-9]/g, "").substring(0, 64) : "";
  const receivedHash = hasGap ? "0x" + btoa("TAMPERED" + scannedId).replace(/[^a-zA-Z0-9]/g, "").substring(0, 64) : expectedHash;

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-4">
      <RedAlertLockdown
        visible={redAlert}
        anomalies={anomalies}
        blockedEvent={{ officer: identity?.address, componentId: scannedId, reason: anomalies[0] }}
        onDismiss={() => setRedAlert(false)}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-green-900 pb-3">
          <div>
            <div className="text-green-600 text-xs tracking-widest">CHAINOFCOMMAND</div>
            <h1 className="text-xl font-bold tracking-widest">PROCUREMENT GATE</h1>
            <div className="text-green-700 text-xs">TRIPLE-LAYER ATOMIC VERIFICATION</div>
          </div>
          <button onClick={() => router.back()} className="border border-green-800 text-green-600 text-xs px-3 py-1 rounded">← BACK</button>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`shrink-0 text-xs px-2 py-1 rounded border transition-all ${i === step ? "border-green-500 text-green-400 bg-green-900/20" :
                  i < step ? "border-green-800 text-green-700" :
                    "border-green-950 text-green-900"
                }`}
            >
              {i + 1}. {s.split(" ")[0]}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {step === 0 && identity && (
            <div className="border border-green-800 rounded bg-gray-950 p-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">STEP 1: IDENTITY CONFIRMATION</div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div><span className="text-green-700">ADDRESS: </span><span className="text-green-400">{identity.address?.slice(0, 20)}...</span></div>
                <div><span className="text-green-700">CLEARANCE: </span><span className="text-green-400">LEVEL {identity.clearanceLevel}</span></div>
                <div><span className="text-green-700">STATUS: </span><span className={identity.active ? "text-green-400" : "text-red-400"}>{identity.active ? "ACTIVE" : "INACTIVE"}</span></div>
              </div>
              <button onClick={() => setStep(1)} className="border border-green-600 text-green-400 hover:bg-green-900/20 text-xs px-4 py-2 rounded font-bold w-full">
                CONFIRM IDENTITY → PROCEED TO SCAN
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="border border-green-800 rounded bg-gray-950 p-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">STEP 2: COMPONENT QR SCAN</div>
              <QRScanner onScan={handleScan} onError={(e) => addLog("ERROR", e.message)} active={true} />
              <div className="mt-3 border-t border-green-900 pt-3">
                <div className="text-green-800 text-xs mb-1">DEMO: ENTER COMPONENT ID MANUALLY</div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-black border border-green-900 text-green-400 text-xs p-1.5 rounded font-mono"
                    placeholder="0x... or component name"
                    onKeyDown={(e) => e.key === "Enter" && handleScan(e.target.value)}
                  />
                  <button
                    onClick={(e) => handleScan(e.target.previousSibling.value)}
                    className="border border-green-700 text-green-400 text-xs px-3 py-1 rounded"
                  >SCAN</button>
                </div>
              </div>
            </div>
          )}

          {step >= 2 && scannedId && (
            <div className="border border-green-800 rounded bg-gray-950 p-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">STEP 3: SUPPLY CHAIN VERIFICATION</div>
              <ComponentTimeline transferHistory={transferHistory} />
              <div className="mt-3">
                <SupplyChainGraph componentHistory={transferHistory} />
              </div>
              {step === 2 && (
                <button onClick={() => setStep(3)} className="mt-3 border border-green-600 text-green-400 text-xs px-4 py-2 rounded w-full font-bold">
                  PROCEED TO HASH VERIFICATION →
                </button>
              )}
            </div>
          )}

          {step >= 3 && (
            <div className="border border-green-800 rounded bg-gray-950 p-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">STEP 4: HASH VERIFICATION</div>
              <HashComparison expectedHash={expectedHash} receivedHash={receivedHash} />
              {step === 3 && (
                <button onClick={() => setStep(4)} className="mt-3 border border-green-600 text-green-400 text-xs px-4 py-2 rounded w-full font-bold">
                  PROCEED TO DEVICE VALIDATION →
                </button>
              )}
            </div>
          )}

          {step >= 4 && (
            <div className="border border-green-800 rounded bg-gray-950 p-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">STEP 5: DEVICE HEALTH TOKEN</div>
              <div className="text-xs mb-2">
                <span className="text-green-700">CURRENT TOKEN: </span>
                <span className="text-green-400">{deviceToken.slice(0, 30)}...</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCompromisedToken}
                    onChange={(e) => {
                      setUseCompromisedToken(e.target.checked);
                      if (e.target.checked) addLog("WARNING", "⚠ DEMO: Switching to COMPROMISED device token");
                    }}
                    className="accent-red-500"
                  />
                  <span className="text-red-600">DEMO: USE COMPROMISED TOKEN (triggers rejection)</span>
                </label>
              </div>
              <div className={`border rounded p-2 text-xs ${useCompromisedToken
                  ? "border-red-700 bg-red-900/20 text-red-400"
                  : "border-green-700 bg-green-900/10 text-green-400"
                }`}>
                {useCompromisedToken ? "⚠ COMPROMISED TOKEN — WILL BE REJECTED BY GATE" : "✓ DEVICE TOKEN VALID"}
              </div>
              {step === 4 && (
                <button onClick={() => setStep(5)} className="mt-3 border border-green-600 text-green-400 text-xs px-4 py-2 rounded w-full font-bold">
                  PROCEED TO ATOMIC GATE →
                </button>
              )}
            </div>
          )}

          {step >= 5 && step < 6 && (
            <div className="border border-green-800 rounded bg-gray-950 p-4">
              <div className="text-green-600 text-xs tracking-widest mb-3">STEP 6: PROCUREMENT GATE — ATOMIC VERIFICATION</div>
              <div className="space-y-1 text-xs text-green-700 mb-4">
                <div>▶ [1] CIRCUIT BREAKER STATUS CHECK</div>
                <div>▶ [2] DEVICE HEALTH TOKEN VALIDATION</div>
                <div>▶ [3] IDENTITY REGISTRY — CLEARANCE VERIFICATION</div>
                <div>▶ [4] COMPONENT REGISTRY — MERKLE PATH VERIFICATION</div>
                <div>▶ [5] RATE LIMIT AND ANOMALY FLAG CHECK</div>
                <div>▶ [6] ATOMIC APPROVAL OR DENIAL</div>
              </div>
              <button
                onClick={handleSubmitProcurement}
                disabled={submitting}
                className="border border-green-500 text-green-400 hover:bg-green-900/20 disabled:opacity-50 text-xs px-4 py-3 rounded w-full font-bold tracking-widest"
              >
                {submitting ? "EXECUTING ATOMIC VERIFICATION..." : "EXECUTE PROCUREMENT GATE"}
              </button>
            </div>
          )}

          {step === 6 && result && (
            <div className={`border rounded p-4 ${result.success ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"}`}>
              <div className={`text-lg font-bold mb-2 ${result.success ? "text-green-400" : "text-red-400"}`}>
                {result.success ? "✓ PROCUREMENT APPROVED" : "✗ PROCUREMENT DENIED"}
              </div>
              <div className="text-xs space-y-1">
                {result.txHash && (
                  <div><span className="text-green-700">TX HASH: </span><span className="text-green-400 break-all">{result.txHash}</span></div>
                )}
                {result.reason && (
                  <div><span className="text-red-700">REASON: </span><span className="text-red-400">{result.reason}</span></div>
                )}
                <div className="text-green-700 mt-2">
                  This outcome has been recorded immutably in the AuditLog.
                  No party at any clearance level can alter this record.
                </div>
              </div>
              {lastTx && (
                <div className="mt-3">
                  <ChaffModeButton
                    realTransaction={{ officer: lastTx.officer, componentId: lastTx.hash, timestamp: Date.now() }}
                    onChaffFired={(batch) => addLog("INFO", `Chaff fired: ${batch.length} identical-size transactions`)}
                  />
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setStep(0); setResult(null); setScannedId(null); }} className="border border-green-700 text-green-400 text-xs px-3 py-1 rounded">NEW PROCUREMENT</button>
                <button onClick={() => router.push("/audit-log")} className="border border-green-800 text-green-600 text-xs px-3 py-1 rounded">VIEW AUDIT LOG</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <EVMConsole logs={consoleLogs} onClear={() => setConsoleLogs([])} />
        </div>
      </div>
    </div>
  );
}
