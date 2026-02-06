"use client";

import { useCallback, useEffect, useState } from "react";
import PunkImage from "@/components/PunkImage";
import Link from "next/link";

interface Punk {
  id: number;
  elo: number;
  wins: number;
  losses: number;
}

export default function LeaderboardPage() {
  const [punks, setPunks] = useState<Punk[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchLeaderboard = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/leaderboard?page=${p}`);
    const data = await res.json();
    setPunks(data.punks);
    setTotalPages(data.totalPages);
    setTotalVotes(data.totalVotes);
    setPage(p);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    fetchLeaderboard(1);
  }, [fetchLeaderboard]);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header - fixed height */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          LEADERBOARD
        </h1>
        <p className="text-sm text-neutral-500">
          {totalVotes.toLocaleString()} total votes
        </p>
      </div>

      {/* Nav - fixed height */}
      <div className="mb-6 h-10 flex items-center">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          &larr; back to voting
        </Link>
      </div>

      {/* Content area - fixed min width to prevent reflow */}
      <div className={`w-full max-w-2xl transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
        {hasLoaded && punks.length === 0 ? (
          <div className="text-neutral-500 text-lg text-center mt-12">
            no votes yet. go vote!
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 gap-y-2 items-center text-xs text-neutral-500 mb-2 px-3">
              <span>#</span>
              <span>punk</span>
              <span className="text-right">elo</span>
              <span className="text-right">w/l</span>
            </div>

            <div className="flex flex-col gap-1" style={{ minHeight: 400 }}>
              {punks.map((punk, i) => {
                const rank = (page - 1) * 50 + i + 1;
                return (
                  <div
                    key={punk.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center px-3 py-2 rounded-lg bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors"
                  >
                    <span className="text-neutral-600 text-sm w-8 text-right">
                      {rank}
                    </span>
                    <div className="flex items-center gap-3">
                      <PunkImage punkId={punk.id} size={32} />
                      <span className="text-sm font-bold text-neutral-300">
                        #{punk.id.toString().padStart(4, "0")}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-400 text-right">
                      {Math.round(punk.elo)}
                    </span>
                    <span className="text-xs text-neutral-500 text-right w-16">
                      {punk.wins}/{punk.losses}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pagination - always takes space */}
            <div className="flex items-center justify-center gap-4 mt-6 h-8">
              {totalPages > 1 && (
                <>
                  <button
                    onClick={() => fetchLeaderboard(page - 1)}
                    disabled={page <= 1 || loading}
                    className="text-sm text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors"
                  >
                    &larr; prev
                  </button>
                  <span className="text-xs text-neutral-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => fetchLeaderboard(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="text-sm text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors"
                  >
                    next &rarr;
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
