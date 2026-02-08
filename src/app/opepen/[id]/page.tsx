"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import OpepenImage from "@/components/OpepenImage";

interface OpepenData {
  id: number;
  rank: number | null;
  totalRanked: number;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  editionSize: number;
  siblingIds: number[];
}

interface HistoryEntry {
  id: number;
  won: boolean;
  opponentId: number;
  createdAt: string;
}

export default function OpepenDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [opepen, setOpepen] = useState<OpepenData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpepen = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/opepen/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setOpepen(data.opepen);
    setHistory(data.history);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!isNaN(id)) fetchOpepen();
  }, [id, fetchOpepen]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="font-mono-caps text-xs text-neutral-500">LOADING...</span>
      </main>
    );
  }

  if (!opepen) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="font-mono-caps text-xs text-neutral-500">OPEPEN NOT FOUND</span>
        <Link href="/opepen/leaderboard" className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors">
          LEADERBOARD
        </Link>
      </main>
    );
  }

  const totalGames = opepen.wins + opepen.losses;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">PVP</h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          OPEPEN #{id}
        </p>
      </div>

      {/* Nav */}
      <div className="mb-8 flex items-center gap-3">
        <Link href="/opepen" className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors">
          &larr; VOTE
        </Link>
        <Link href="/opepen/leaderboard" className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors">
          LEADERBOARD
        </Link>
      </div>

      {/* Opepen card */}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <OpepenImage opepenId={opepen.id} className="w-[160px] sm:w-[200px] aspect-square rounded-xl" />
          <h2 className="font-mono-caps text-lg mt-4 text-white">
            #{opepen.id}
          </h2>
          {opepen.editionSize > 1 && (
            <span className="font-mono-caps text-[10px] text-neutral-500 mt-1">
              PRINT EDITION &middot; 1 OF {opepen.editionSize}
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">RANK</div>
            <div className="font-mono-caps text-sm text-white">
              {opepen.rank ? `${opepen.rank} / ${opepen.totalRanked}` : "UNRANKED"}
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">ELO</div>
            <div className="font-mono-caps text-sm text-green-400">{Math.round(opepen.elo)}</div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">WIN RATE</div>
            <div className="font-mono-caps text-sm text-white">
              {totalGames > 0 ? `${opepen.winRate}%` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">WINS</div>
            <div className="font-mono-caps text-sm text-green-400">{opepen.wins}</div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">LOSSES</div>
            <div className="font-mono-caps text-sm text-red-400">{opepen.losses}</div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">MATCHUPS</div>
            <div className="font-mono-caps text-sm text-white">{totalGames}</div>
          </div>
        </div>

        {/* Siblings (print editions) */}
        {opepen.siblingIds.length > 0 && (
          <div className="mb-8">
            <h3 className="font-mono-caps text-[10px] text-neutral-600 mb-3">
              SAME IMAGE ({opepen.editionSize} TOKENS)
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="font-mono-caps text-[10px] px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700">
                #{opepen.id}
              </span>
              {opepen.siblingIds.map((sid) => (
                <Link
                  key={sid}
                  href={`/opepen/${sid}`}
                  className="font-mono-caps text-[10px] px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-600 transition-colors"
                >
                  #{sid}
                </Link>
              ))}
              {opepen.editionSize > opepen.siblingIds.length + 1 && (
                <span className="font-mono-caps text-[10px] px-3 py-1.5 text-neutral-600">
                  +{opepen.editionSize - opepen.siblingIds.length - 1} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Vote history */}
        <div>
          <h3 className="font-mono-caps text-[10px] text-neutral-600 mb-3">
            MATCH HISTORY {history.length > 0 && `(${history.length})`}
          </h3>
          {history.length === 0 ? (
            <div className="font-mono-caps text-[10px] text-neutral-600">NO MATCHES YET</div>
          ) : (
            <div className="flex flex-col gap-1">
              {history.map((h) => (
                <Link
                  key={h.id}
                  href={`/opepen/${h.opponentId}`}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-neutral-900/50 transition-colors group"
                >
                  <span className={`font-mono-caps text-[10px] w-8 shrink-0 ${h.won ? "text-green-400" : "text-red-400"}`}>
                    {h.won ? "WIN" : "LOSS"}
                  </span>
                  <span className="font-mono-caps text-[10px] text-neutral-500">VS</span>
                  <OpepenImage opepenId={h.opponentId} className="w-6 h-6 rounded-full shrink-0" />
                  <span className="font-mono-caps text-[10px] text-neutral-400 group-hover:text-white transition-colors">
                    #{h.opponentId}
                  </span>
                  <span className="font-mono-caps text-[10px] text-neutral-700 ml-auto">
                    {new Date(h.createdAt + "Z").toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
