"use client";
import { useState } from "react";
import HashComparison from "./HashComparison";

function formatDate(timestamp) {
  if (!timestamp) return "UNKNOWN";
  const d = new Date(
    typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp
  );
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export default function ComponentTimeline({
  transferHistory = [],
  selectedNodeIndex = null,
  onNodeSelect,
}) {
  const [selected, setSelected] = useState(selectedNodeIndex);

  function handleSelect(i) {
    setSelected(i);
    onNodeSelect?.(i);
  }

  const selectedTransfer = selected !== null ? transferHistory[selected] : null;

  const expectedHash = selectedTransfer
    ? selectedTransfer.expectedHash ||
    (selectedTransfer.from
      ? "0x" + btoa(selectedTransfer.from + String(selectedTransfer.timestamp)).replace(/[^a-zA-Z0-9]/g, "").substring(0, 64)
      : "0x" + "0".repeat(64))
    : null;

  const receivedHash = selectedTransfer
    ? selectedTransfer.receivedHash ||
    (selectedTransfer.verified
      ? expectedHash
      : "0x" + btoa("TAMPERED" + String(selectedTransfer.timestamp)).replace(/[^a-zA-Z0-9]/g, "").substring(0, 64))
    : null;

  return (
    <div className="component-timeline font-mono">
      <div className="text-green-400 text-xs tracking-widest mb-3 font-bold">
        COMPONENT LIFECYCLE TIMELINE
      </div>

      <div className="relative">
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-green-900" />

        <div className="flex gap-0 overflow-x-auto pb-4">
          {transferHistory.length === 0 && (
            <div className="text-green-800 text-xs py-4">NO TRANSFER HISTORY</div>
          )}

          {transferHistory.map((transfer, i) => {
            const isGap = !transfer.verified;
            const isSelected = selected === i;
            const color = isGap ? "border-red-500 text-red-400" : "border-green-500 text-green-400";
            const bgColor = isGap ? "bg-red-900/30" : "bg-green-900/30";
            const dotColor = isGap ? "bg-red-500" : "bg-green-500";

            const label = i === 0 ? "MANUFACTURE" :
              i === 1 ? "QC CHECK" :
                i === 2 ? "VENDOR" :
                  i === 3 ? "BASE ARRIVAL" :
                    `TRANSFER ${i}`;

            return (
              <div
                key={i}
                className="relative flex flex-col items-center cursor-pointer shrink-0"
                style={{ minWidth: 140 }}
                onClick={() => handleSelect(i)}
              >
                <div
                  className={`w-4 h-4 rounded-full z-10 mt-4 mb-2 border-2 ${dotColor} border-current transition-all ${isSelected ? "scale-150 ring-2 ring-yellow-400" : "hover:scale-125"
                    }`}
                />

                <div className={`border rounded p-2 text-xs mx-2 ${color} ${bgColor} ${isSelected ? "ring-1 ring-yellow-400" : ""
                  } transition-all`}>
                  <div className="font-bold text-center">{label}</div>
                  <div className="text-green-600 mt-1">{formatDate(transfer.timestamp)}</div>
                  <div className="mt-1">
                    {transfer.to ? `→ ${transfer.to.slice(0, 8)}...` : "ORIGIN"}
                  </div>
                  <div className={`mt-1 font-bold ${isGap ? "text-red-400" : "text-green-400"}`}>
                    {isGap ? "⚠ UNVERIFIED" : "✓ VERIFIED"}
                  </div>
                  {transfer.locationHash && (
                    <div className="text-green-800 mt-1 text-xs">
                      LOC: {transfer.locationHash.slice(0, 10)}...
                    </div>
                  )}
                </div>

                {i < transferHistory.length - 1 && (
                  <div className={`absolute top-6 left-1/2 w-full h-0.5 z-0 ${isGap ? "bg-red-500" : "bg-green-700"
                    }`} style={{ transform: "translateX(50%)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedTransfer && expectedHash && receivedHash && (
        <div className="mt-4 border border-green-800 rounded p-3">
          <div className="text-green-400 text-xs font-bold mb-2 tracking-widest">
            HASH VERIFICATION — NODE {selected}: {
              transferHistory[selected].verified ? "VERIFIED" : "⚠ MERKLE PATH FAILURE"
            }
          </div>
          <div className="text-green-600 text-xs mb-2">
            Authority: {selectedTransfer.from?.slice(0, 16) || "ORIGIN"}...
            {selectedTransfer.locationHash
              ? ` | Location: ${selectedTransfer.locationHash.slice(0, 12)}...`
              : ""}
          </div>
          <HashComparison expectedHash={expectedHash} receivedHash={receivedHash} />
        </div>
      )}
    </div>
  );
}
