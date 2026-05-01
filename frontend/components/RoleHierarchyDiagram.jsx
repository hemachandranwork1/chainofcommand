"use client";

const ROLES = [
  {
    level: 1,
    title: "SOLDIER",
    color: "#4ade80",
    can: ["View own identity record"],
    cannot: ["Procurement access", "Component verification", "Audit log access"],
  },
  {
    level: 2,
    title: "JUNIOR OFFICER",
    color: "#86efac",
    can: ["Verify components", "View own access history"],
    cannot: ["Approve procurement", "View full audit log"],
  },
  {
    level: 3,
    title: "PROCUREMENT OFFICER",
    color: "#facc15",
    can: ["Approve procurement up to threshold", "Component verification", "Threat dashboard"],
    cannot: ["Approve above clearance category", "Delete audit logs", "Governance votes"],
  },
  {
    level: 4,
    title: "COMMANDER",
    color: "#f97316",
    can: ["Approve above threshold (with 2nd sig)", "Full audit log read", "Governance multisig votes", "Emergency revocation"],
    cannot: ["Delete any log", "Act alone on critical actions"],
  },
  {
    level: 5,
    title: "AUDITOR",
    color: "#c084fc",
    can: ["Read-only access to everything", "Export cryptographic proof PDF", "View honey-token alerts"],
    cannot: ["Approve anything", "Modify any record", "Receive procurement permissions ever"],
  },
];

const GOV = {
  title: "GOVERNANCE MULTISIG",
  color: "#60a5fa",
  note: "2-of-3: Commander + Auditor + Procurement Command",
};

export default function RoleHierarchyDiagram() {
  return (
    <div className="font-mono text-xs bg-gray-950 border border-green-900 rounded p-4">
      <div className="text-green-400 font-bold tracking-widest text-sm mb-4 text-center">
        ROLE HIERARCHY & ACCESS CONTROL
      </div>

      <div className="flex flex-col gap-2">
        {ROLES.map((role, i) => (
          <div key={role.level} className="relative">
            <div
              className="border rounded p-2 flex gap-4"
              style={{ borderColor: role.color + "60" }}
            >
              <div
                className="flex items-center justify-center font-bold text-base shrink-0 w-8 h-8 rounded"
                style={{ backgroundColor: role.color + "20", color: role.color }}
              >
                {role.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold mb-1" style={{ color: role.color }}>
                  {role.title}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-green-700 mb-0.5">CAN:</div>
                    {role.can.map((c) => (
                      <div key={c} className="text-green-500">✓ {c}</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-red-900 mb-0.5">CANNOT:</div>
                    {role.cannot.map((c) => (
                      <div key={c} className="text-red-700">✗ {c}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {i < ROLES.length - 1 && (
              <div className="flex justify-center my-1">
                <div className="text-green-900">│</div>
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-center my-1">
          <div className="text-blue-900">▼</div>
        </div>

        <div className="border rounded p-2" style={{ borderColor: GOV.color + "60" }}>
          <div className="font-bold mb-1" style={{ color: GOV.color }}>
            {GOV.title}
          </div>
          <div className="text-blue-400">{GOV.note}</div>
          <div className="text-blue-300 mt-1">
            Controls: Identity registration, clearance updates, circuit breaker, revocations
          </div>
          <div className="text-blue-700 mt-1">
            Rule: No single address has unilateral power at any level
          </div>
        </div>
      </div>
    </div>
  );
}
