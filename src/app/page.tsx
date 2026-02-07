"use client";

import { useCallback, useEffect, useState } from "react";
import PunkImage from "@/components/PunkImage";
import OnlineCount from "@/components/OnlineCount";
import Link from "next/link";

export default function VotePage() {
  const [punk1, setPunk1] = useState<number>(0);
  const [punk2, setPunk2] = useState<number>(1);
  const [ready, setReady] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [selected, setSelected] = useState<"left" | "right" | null>(null);

  const fetchMatchup = useCallback(async () => {
    const res = await fetch("/api/matchup");
    const data = await res.json();
    setPunk1(data.punk1);
    setPunk2(data.punk2);
    setReady(true);
    setSelected(null);
  }, []);

  useEffect(() => {
    fetchMatchup();
  }, [fetchMatchup]);

  const vote = async (winnerId: number, loserId: number, side: "left" | "right") => {
    if (voting || !ready) return;
    setSelected(side);
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

  // Keyboard voting: left/right arrow keys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") vote(punk1, punk2, "left");
      else if (e.key === "ArrowRight") vote(punk2, punk1, "right");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const busy = !ready || voting;

  const cardClass = (side: "left" | "right") => {
    const isSelected = selected === side;
    return `group flex flex-col items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-150 cursor-pointer disabled:cursor-default ${
      isSelected
        ? "border-green-500 bg-green-500/10"
        : "border-neutral-800 hover:border-green-500 hover:bg-green-500/5"
    } ${busy ? "opacity-50 pointer-events-none" : ""}`;
  };

  const labelClass = (side: "left" | "right") => {
    const isSelected = selected === side;
    return `font-mono-caps text-xs font-bold transition-colors ${
      isSelected
        ? "text-green-400"
        : "text-neutral-400 group-hover:text-green-400"
    }`;
  };

  return (
    <main className="relative flex flex-col items-center justify-center px-4" style={{ height: "calc(100dvh - 28px)", overflow: "hidden" }}>
      <OnlineCount />
      {/* Top right leaderboard link */}
      <Link
        href="/leaderboard"
        className="absolute top-4 right-4 font-mono-caps text-[10px] text-neutral-600 hover:text-white border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded-lg transition-colors"
      >
        LEADERBOARD
      </Link>

      {/* Header - fixed height */}
      <div className="mb-8 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PUNKCOMP
        </h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          which punk looks better?
        </p>
      </div>

      {/* Matchup area - always side by side with fixed dimensions */}
      <div
        className="flex flex-row items-center gap-4 sm:gap-12"
        style={{ minHeight: 280 }}
      >
        <button
          onClick={() => vote(punk1, punk2, "left")}
          disabled={busy}
          className={cardClass("left")}
        >
          <PunkImage punkId={punk1} className="w-[140px] sm:w-[192px]" />
          <span className={labelClass("left")}>
            #{punk1.toString().padStart(4, "0")}
          </span>
        </button>

        <button
          onClick={() => vote(punk2, punk1, "right")}
          disabled={busy}
          className={cardClass("right")}
        >
          <PunkImage punkId={punk2} className="w-[140px] sm:w-[192px]" />
          <span className={labelClass("right")}>
            #{punk2.toString().padStart(4, "0")}
          </span>
        </button>
      </div>

      {/* Skip button - fixed height */}
      <div className="mt-8 h-6 flex items-center">
        <button
          onClick={fetchMatchup}
          disabled={busy}
          className="font-mono-caps text-neutral-600 hover:text-neutral-400 text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
        >
          skip &rarr;
        </button>
      </div>

      {/* Vote count */}
      <div className="mt-12 h-8 flex items-center justify-center">
        <p className={`font-mono-caps text-[10px] text-neutral-600 ${voteCount > 0 ? "visible" : "invisible"}`}>
          {voteCount} vote{voteCount !== 1 ? "s" : ""} this session
        </p>
      </div>

      {/* Bottom right feature suggestion */}
      <a
        href="https://x.com/jackbutcher/status/2019825566522978796"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 font-mono-caps text-[10px] text-neutral-700 hover:text-neutral-400 transition-colors"
      >
        HAVE A FEATURE SUGGESTION?
      </a>
    </main>
  );
}
