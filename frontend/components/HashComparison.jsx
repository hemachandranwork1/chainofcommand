"use client";

export default function HashComparison({ expectedHash = "", receivedHash = "" }) {
  const match = expectedHash && receivedHash && expectedHash === receivedHash;
  const bothPresent = expectedHash && receivedHash;

  function renderHashWithDiff(hash, otherHash, isExpected) {
    if (!hash) return <span className="text-green-900">NO HASH PROVIDED</span>;
    if (!otherHash || match) {
      return (
        <span className={match ? "text-green-400" : "text-green-400"}>
          {hash}
        </span>
      );
    }
    return (
      <span>
        {hash.split("").map((char, i) => {
          const differs = otherHash[i] !== char;
          return (
            <span
              key={i}
              className={differs ? "bg-red-700 text-white" : "text-red-300"}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className="hash-comparison font-mono text-xs">
      {bothPresent && !match && (
        <div className="mb-2 border border-red-500 bg-red-900/20 rounded px-2 py-1 text-red-400 font-bold text-center tracking-widest animate-pulse">
          ⚠ MERKLE PATH FAILURE — HASH MISMATCH DETECTED
        </div>
      )}

      {match && (
        <div className="mb-2 border border-green-500 bg-green-900/20 rounded px-2 py-1 text-green-400 font-bold text-center tracking-widest">
          ✓ HASH VERIFIED — MERKLE PATH INTACT
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className={`text-xs mb-1 font-bold ${match ? "text-green-600" : "text-red-600"}`}>
            EXPECTED HASH (MANUFACTURER SIGNED):
          </div>
          <div className={`p-2 rounded border text-xs break-all leading-relaxed ${match
              ? "bg-green-900/10 border-green-800"
              : "bg-red-900/10 border-red-800"
            }`}>
            {renderHashWithDiff(expectedHash, receivedHash, true)}
          </div>
        </div>

        <div>
          <div className={`text-xs mb-1 font-bold ${match ? "text-green-600" : "text-red-600"}`}>
            RECEIVED HASH (AT BASE):
          </div>
          <div className={`p-2 rounded border text-xs break-all leading-relaxed ${match
              ? "bg-green-900/10 border-green-800"
              : "bg-red-900/10 border-red-800"
            }`}>
            {renderHashWithDiff(receivedHash, expectedHash, false)}
          </div>
        </div>
      </div>

      {bothPresent && !match && (
        <div className="mt-2 text-red-700 text-xs text-center">
          Highlighted characters indicate tampered bytes.
          Supply chain integrity cannot be guaranteed.
        </div>
      )}
    </div>
  );
}
