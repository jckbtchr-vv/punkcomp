"use client";

import { useCallback, useEffect, useState } from "react";
import PunkImage from "@/components/PunkImage";
import Link from "next/link";

export default function VotePage() {
  const [punk1, setPunk1] = useState<number>(0);
  const [punk2, setPunk2] = useState<number>(1);
  const [ready, setReady] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const fetchMatchup = useCallback(async () => {
    const res = await fetch("/api/matchup");
    const data = await res.json();
    setPunk1(data.punk1);
    setPunk2(data.punk2);
    setReady(true);
  }, []);

  useEffect(() => {
    fetchMatchup();
  }, [fetchMatchup]);

  const vote = async (winnerId: number, loserId: number) => {
    if (voting || !ready) return;
    setVoting(true);
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId, loserId }),
    });
    setVoteCount((c) => c + 1);
    setVoting(false);
    fetchMatchup();
  };

  const busy = !ready || voting;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header - fixed height */}
      <div className="mb-8 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PUNKCOMP
        </h1>
        <p className="text-sm text-neutral-500">
          which punk looks better?
        </p>
      </div>

      {/* Matchup area - always side by side with fixed dimensions */}
      <div
        className="flex flex-row items-center gap-4 sm:gap-12"
        style={{ minHeight: 280 }}
      >
        <button
          onClick={() => vote(punk1, punk2)}
          disabled={busy}
          className={`group flex flex-col items-center gap-3 p-3 sm:p-4 rounded-xl border border-neutral-800 hover:border-green-500 hover:bg-green-500/5 transition-all duration-150 cursor-pointer disabled:cursor-default ${busy ? "opacity-50 pointer-events-none" : ""}`}
        >
          <PunkImage punkId={punk1} className="w-[140px] sm:w-[192px]" />
          <span className="text-neutral-400 group-hover:text-green-400 text-sm font-bold transition-colors">
            #{punk1.toString().padStart(4, "0")}
          </span>
        </button>

        <button
          onClick={() => vote(punk2, punk1)}
          disabled={busy}
          className={`group flex flex-col items-center gap-3 p-3 sm:p-4 rounded-xl border border-neutral-800 hover:border-green-500 hover:bg-green-500/5 transition-all duration-150 cursor-pointer disabled:cursor-default ${busy ? "opacity-50 pointer-events-none" : ""}`}
        >
          <PunkImage punkId={punk2} className="w-[140px] sm:w-[192px]" />
          <span className="text-neutral-400 group-hover:text-green-400 text-sm font-bold transition-colors">
            #{punk2.toString().padStart(4, "0")}
          </span>
        </button>
      </div>

      {/* Skip button - fixed height */}
      <div className="mt-8 h-6 flex items-center">
        <button
          onClick={fetchMatchup}
          disabled={busy}
          className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
        >
          skip &rarr;
        </button>
      </div>

      {/* Footer - fixed height, vote count always occupies space */}
      <div className="mt-12 h-16 flex flex-col items-center justify-center gap-3">
        <p className={`text-xs text-neutral-600 h-4 ${voteCount > 0 ? "visible" : "invisible"}`}>
          {voteCount} vote{voteCount !== 1 ? "s" : ""} this session
        </p>
        <Link
          href="/leaderboard"
          className="text-sm text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          view leaderboard
        </Link>
      </div>
    </main>
  );
}
