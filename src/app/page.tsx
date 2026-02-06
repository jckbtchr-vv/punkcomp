"use client";

import { useCallback, useEffect, useState } from "react";
import PunkImage from "@/components/PunkImage";
import Link from "next/link";

export default function VotePage() {
  const [punk1, setPunk1] = useState<number | null>(null);
  const [punk2, setPunk2] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const fetchMatchup = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/matchup");
    const data = await res.json();
    setPunk1(data.punk1);
    setPunk2(data.punk2);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatchup();
  }, [fetchMatchup]);

  const vote = async (winnerId: number, loserId: number) => {
    if (voting) return;
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PUNKCOMP
        </h1>
        <p className="text-sm text-neutral-500">
          which punk looks better?
        </p>
      </div>

      {loading || punk1 === null || punk2 === null ? (
        <div className="text-neutral-500 animate-pulse text-lg">loading punks...</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12">
          <button
            onClick={() => vote(punk1, punk2)}
            disabled={voting}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-neutral-800 hover:border-green-500 hover:bg-green-500/5 transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <PunkImage punkId={punk1} size={192} />
            <span className="text-neutral-400 group-hover:text-green-400 text-sm font-bold transition-colors">
              #{punk1.toString().padStart(4, "0")}
            </span>
          </button>

          <div className="text-neutral-600 text-2xl font-bold select-none">
            vs
          </div>

          <button
            onClick={() => vote(punk2, punk1)}
            disabled={voting}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-neutral-800 hover:border-green-500 hover:bg-green-500/5 transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <PunkImage punkId={punk2} size={192} />
            <span className="text-neutral-400 group-hover:text-green-400 text-sm font-bold transition-colors">
              #{punk2.toString().padStart(4, "0")}
            </span>
          </button>
        </div>
      )}

      <button
        onClick={fetchMatchup}
        disabled={loading || voting}
        className="mt-8 text-neutral-600 hover:text-neutral-400 text-sm transition-colors cursor-pointer disabled:opacity-30"
      >
        skip &rarr;
      </button>

      <div className="mt-12 flex flex-col items-center gap-3">
        {voteCount > 0 && (
          <p className="text-xs text-neutral-600">
            {voteCount} vote{voteCount !== 1 ? "s" : ""} this session
          </p>
        )}
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
