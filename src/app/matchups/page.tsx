"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Matchup {
  traitA: string;
  traitB: string;
  aWins: number;
  bWins: number;
  total: number;
  aPct: number;
}

function MatchupBar({ matchup, onClickTrait }: { matchup: Matchup; onClickTrait: (trait: string) => void }) {
  const bPct = 100 - matchup.aPct;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className="font-mono-caps text-[10px] text-green-400 w-28 text-right truncate shrink-0 cursor-pointer hover:underline"
        onClick={() => onClickTrait(matchup.traitA)}
      >
        {matchup.traitA}
      </span>
      <div className="flex-1 flex h-5 rounded overflow-hidden bg-neutral-900/50">
        <div
          className={`flex items-center justify-end pr-1.5 ${bPct === 0 ? "rounded" : "rounded-l"}`}
          style={{
            width: `${matchup.aPct}%`,
            background: "linear-gradient(90deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.25) 100%)",
          }}
        >
          {matchup.aPct > 15 && (
            <span className="font-mono-caps text-[9px] text-green-400/80">
              {matchup.aPct}%
            </span>
          )}
        </div>
        {bPct > 0 && (
          <div
            className={`flex items-center justify-start pl-1.5 ${matchup.aPct === 0 ? "rounded" : "rounded-r"}`}
            style={{
              width: `${bPct}%`,
              background: "linear-gradient(90deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.08) 100%)",
            }}
          >
            {bPct > 15 && (
              <span className="font-mono-caps text-[9px] text-red-400/80">
                {bPct}%
              </span>
            )}
          </div>
        )}
      </div>
      <span
        className="font-mono-caps text-[10px] text-red-400 w-28 truncate shrink-0 cursor-pointer hover:underline"
        onClick={() => onClickTrait(matchup.traitB)}
      >
        {matchup.traitB}
      </span>
    </div>
  );
}

export default function MatchupsPage() {
  const [typeMatchups, setTypeMatchups] = useState<Matchup[]>([]);
  const [accessoryMatchups, setAccessoryMatchups] = useState<Matchup[]>([]);
  const [traitCountMatchups, setTraitCountMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusTrait, setFocusTrait] = useState<string | null>(null);

  const fetchMatchups = useCallback(async (trait?: string | null) => {
    setLoading(true);
    const url = trait ? `/api/matchups?trait=${encodeURIComponent(trait)}` : "/api/matchups";
    const res = await fetch(url);
    const data = await res.json();
    setTypeMatchups(data.typeMatchups);
    setAccessoryMatchups(data.accessoryMatchups);
    setTraitCountMatchups(data.traitCountMatchups || []);
    setFocusTrait(data.focusTrait || null);
    setLoading(false);
  }, []);

  const handleClickTrait = useCallback((trait: string) => {
    fetchMatchups(trait);
  }, [fetchMatchups]);

  const clearFocus = useCallback(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  const empty = typeMatchups.length === 0 && accessoryMatchups.length === 0 && traitCountMatchups.length === 0;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PVP
        </h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          TRAIT MATCHUPS
        </p>
      </div>

      {/* Nav */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          &larr; VOTE
        </Link>
        <Link
          href="/leaderboard"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          LEADERBOARD
        </Link>
        {focusTrait && (
          <button
            onClick={clearFocus}
            disabled={loading}
            className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            &times; {focusTrait}
          </button>
        )}
        <button
          onClick={() => fetchMatchups(focusTrait)}
          disabled={loading}
          className="font-mono-caps text-xs text-neutral-500 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          SHUFFLE
        </button>
      </div>

      {/* Matchups */}
      <div className={`w-full max-w-2xl transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
        {empty && !loading ? (
          <div className="text-neutral-500 text-sm text-center mt-12 font-mono-caps">
            NOT ENOUGH VOTES YET
          </div>
        ) : (
          <>
            {typeMatchups.length > 0 && (
              <div className="mb-6">
                <h2 className="font-mono-caps text-[10px] text-neutral-600 mb-2">TYPES</h2>
                <div className="flex flex-col">
                  {typeMatchups.map((m, i) => (
                    <MatchupBar key={`t-${m.traitA}-${m.traitB}-${i}`} matchup={m} onClickTrait={handleClickTrait} />
                  ))}
                </div>
              </div>
            )}

            {accessoryMatchups.length > 0 && (
              <div className="mb-6">
                <h2 className="font-mono-caps text-[10px] text-neutral-600 mb-2">ACCESSORIES</h2>
                <div className="flex flex-col">
                  {accessoryMatchups.map((m, i) => (
                    <MatchupBar key={`a-${m.traitA}-${m.traitB}-${i}`} matchup={m} onClickTrait={handleClickTrait} />
                  ))}
                </div>
              </div>
            )}

            {traitCountMatchups.length > 0 && (
              <div>
                <h2 className="font-mono-caps text-[10px] text-neutral-600 mb-2">NUMBER OF TRAITS</h2>
                <div className="flex flex-col">
                  {traitCountMatchups.map((m, i) => (
                    <MatchupBar key={`c-${m.traitA}-${m.traitB}-${i}`} matchup={m} onClickTrait={handleClickTrait} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
