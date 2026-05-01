"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateKeyPair, storeKeyPair, loadKeyPair } from "../../lib/keyPair";
import RoleHierarchyDiagram from "../../components/RoleHierarchyDiagram";

const ROLES = [
  { value: "SOLDIER", label: "SOLDIER — LEVEL 1", dashboard: "/dashboard/officer" },
  { value: "JUNIOR_OFFICER", label: "JUNIOR OFFICER — LEVEL 2", dashboard: "/dashboard/officer" },
  { value: "PROCUREMENT_OFFICER", label: "PROCUREMENT OFFICER — LEVEL 3", dashboard: "/dashboard/officer" },
  { value: "COMMANDER", label: "COMMANDER — LEVEL 4", dashboard: "/dashboard/commander" },
  { value: "AUDITOR", label: "AUDITOR — LEVEL 5", dashboard: "/dashboard/auditor" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("PROCUREMENT_OFFICER");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [address, setAddress] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError("PIN must be at least 4 characters");
      return;
    }
    try {
      setStatus("loading");
      setError(null);

      let keyData = loadKeyPair(pin);
      if (!keyData) {
        const generated = generateKeyPair();
        storeKeyPair(generated.privateKey, generated.address, pin);
        keyData = { privateKey: generated.privateKey, address: generated.address };
      }

      setAddress(keyData.address);
      sessionStorage.setItem("coc_role", role);
      sessionStorage.setItem("coc_address", keyData.address);

      const selectedRole = ROLES.find((r) => r.value === role);
      setStatus("success");
      setTimeout(() => router.push(selectedRole?.dashboard || "/dashboard/officer"), 800);
    } catch (err) {
      setError(err.message || "Authentication failed");
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="text-green-600 text-xs tracking-widest mb-2">
              ▶ DEFENSE PROCUREMENT SECURITY SYSTEM v1.0
            </div>
            <h1 className="text-4xl font-bold text-green-400 tracking-widest mb-2">
              CHAINOFCOMMAND
            </h1>
            <p className="text-green-700 text-xs tracking-wider">
              DUAL-LAYER BLOCKCHAIN VERIFICATION FOR DEFENSE PROCUREMENT
            </p>
            <p className="text-green-900 text-xs mt-1">
              TRUST THE PERSON. TRUST THE COMPONENT. TRUST NOTHING ELSE.
            </p>
          </div>

          <div className="border border-green-800 rounded bg-gray-950 p-6 mb-6">
            <div className="text-green-600 text-xs tracking-widest mb-4 border-b border-green-900 pb-2">
              AUTHENTICATION — CRYPTOGRAPHIC KEY PAIR
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-green-600 text-xs tracking-widest block mb-1">
                  ROLE SELECTION
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black border border-green-800 text-green-400 text-xs p-2 rounded font-mono focus:outline-none focus:border-green-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-green-600 text-xs tracking-widest block mb-1">
                  ACCESS PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="ENTER PIN..."
                  minLength={4}
                  className="w-full bg-black border border-green-800 text-green-400 text-xs p-2 rounded font-mono focus:outline-none focus:border-green-500 placeholder-green-900"
                />
                <div className="text-green-900 text-xs mt-1">
                  New PIN generates a fresh key pair. Same PIN retrieves existing key pair.
                </div>
              </div>

              {error && (
                <div className="border border-red-700 bg-red-900/20 rounded p-2 text-red-400 text-xs">
                  ⚠ {error}
                </div>
              )}

              {status === "success" && address && (
                <div className="border border-green-600 bg-green-900/20 rounded p-2">
                  <div className="text-green-400 text-xs font-bold">✓ AUTHENTICATED</div>
                  <div className="text-green-600 text-xs break-all mt-1">ADDRESS: {address}</div>
                  <div className="text-green-700 text-xs mt-1 animate-pulse">
                    REDIRECTING TO DASHBOARD...
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="w-full border border-green-600 text-green-400 hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded transition-all font-bold tracking-widest text-xs"
              >
                {status === "loading" ? "AUTHENTICATING..." : "AUTHENTICATE & ENTER"}
              </button>
            </form>
          </div>

          <div className="border border-green-900 rounded bg-gray-950 p-4 mb-6">
            <div className="text-green-700 text-xs tracking-widest mb-3">
              SYSTEM STATUS
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                ["BLOCKCHAIN", "LOCAL HARDHAT", "text-green-400"],
                ["CONTRACTS", "6 DEPLOYED", "text-green-400"],
                ["ENCRYPTION", "AES-256-GCM", "text-green-400"],
              ].map(([label, value, color]) => (
                <div key={label} className="border border-green-900 rounded p-2 text-center">
                  <div className="text-green-700">{label}</div>
                  <div className={`${color} font-bold`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <RoleHierarchyDiagram />

          <div className="text-center mt-6 text-green-900 text-xs">
            CHAINOFCOMMAND — DEFENSE PROCUREMENT SECURITY SYSTEM
            <br />
            FORMAL INVARIANT: APPROVAL CANNOT EMIT UNLESS ALL THREE LAYERS VERIFY SIMULTANEOUSLY
          </div>
        </div>
      </div>
    </div>
  );
}
