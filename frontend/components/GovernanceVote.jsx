"use client";
import { useState } from "react";
import { getContracts } from "../lib/contracts";

const STATUS_COLORS = {
  PENDING: "text-yellow-400 border-yellow-600",
  EXECUTED: "text-green-400 border-green-600",
  REVOKED: "text-red-400 border-red-600",
  EXPIRED: "text-gray-500 border-gray-700",
};

const ACTION_LABELS = {
  0: "REGISTER SOLDIER",
  1: "REVOKE SOLDIER",
  2: "UPDATE CLEARANCE",
  3: "PAUSE SYSTEM",
  4: "UNPAUSE SYSTEM",
};

const ELIGIBLE_ROLES = ["COMMANDER", "AUDITOR", "PROCUREMENT_COMMAND", "commander", "auditor", "procurement_command"];

export default function GovernanceVote({ proposals = [], currentRole = "", onVote }) {
  const [votingId, setVotingId] = useState(null);
  const [txHashes, setTxHashes] = useState({});
  const [errors, setErrors] = useState({});

  const canVote = ELIGIBLE_ROLES.includes(currentRole);

  async function handleVote(proposalId) {
    try {
      setVotingId(proposalId);
      setErrors((e) => ({ ...e, [proposalId]: null }));
      const { governanceMultiSig } = await getContracts(true);
      const tx = await governanceMultiSig.vote(proposalId);
      const receipt = await tx.wait();
      setTxHashes((h) => ({ ...h, [proposalId]: receipt.hash }));
      onVote?.(proposalId, receipt.hash);
    } catch (err) {
      setErrors((e) => ({ ...e, [proposalId]: err.message || "Vote failed" }));
    } finally {
      setVotingId(null);
    }
  }

  return (
    <div className="governance-vote font-mono border border-green-800 rounded p-3 bg-gray-950">
      <div className="text-green-400 text-xs font-bold tracking-widest mb-3">
        GOVERNANCE MULTISIG — ACTIVE PROPOSALS
      </div>

      {proposals.length === 0 && (
        <div className="text-green-900 text-xs text-center py-4">NO ACTIVE PROPOSALS</div>
      )}

      <div className="space-y-3">
        {proposals.map((proposal) => {
          const statusStyle = STATUS_COLORS[proposal.status] || STATUS_COLORS.PENDING;
          const actionLabel = ACTION_LABELS[proposal.actionType] || `ACTION ${proposal.actionType}`;
          const isPending = proposal.status === "PENDING" || proposal.status === 0;
          const isVoting = votingId === proposal.id;

          return (
            <div key={proposal.id} className={`border rounded p-3 ${statusStyle}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold">{actionLabel}</div>
                <span className={`text-xs border px-2 py-0.5 rounded ${statusStyle}`}>
                  {typeof proposal.status === "number"
                    ? ["PENDING", "EXECUTED", "REVOKED", "EXPIRED"][proposal.status]
                    : proposal.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs text-green-600 mb-2">
                <div>PROPOSER: {proposal.proposer?.slice(0, 10)}...</div>
                <div>TARGET: {proposal.targetAddress?.slice(0, 10)}...</div>
                {proposal.clearanceLevel > 0 && (
                  <div>CLEARANCE: {proposal.clearanceLevel}</div>
                )}
                {proposal.reason && (
                  <div className="col-span-2">REASON: {proposal.reason}</div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded border ${i < (proposal.voteCount || 0)
                          ? "bg-green-500 border-green-400"
                          : "bg-gray-900 border-green-900"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-green-600">
                  {proposal.voteCount || 0}/2 REQUIRED
                </span>
              </div>

              {isPending && canVote && (
                <button
                  onClick={() => handleVote(proposal.id)}
                  disabled={isVoting}
                  className="border border-green-600 text-green-400 hover:bg-green-900/20 disabled:opacity-50 text-xs px-3 py-1 rounded transition-all w-full"
                >
                  {isVoting ? "SUBMITTING VOTE..." : "CAST VOTE"}
                </button>
              )}

              {txHashes[proposal.id] && (
                <div className="mt-2 text-green-600 text-xs break-all">
                  ✓ VOTED: {txHashes[proposal.id]}
                </div>
              )}

              {errors[proposal.id] && (
                <div className="mt-2 text-red-400 text-xs">{errors[proposal.id]}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
