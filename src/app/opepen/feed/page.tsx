"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import OpepenImage from "@/components/OpepenImage";

interface Vote {
  id: number;
  winnerId: number;
  loserId: number;
  createdAt: string;
  winnerElo: number;
  loserElo: number;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + "Z").getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 5) return "JUST NOW";
  if (diff < 60) return `${diff}S AGO`;
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

export default function OpepenFeedPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const latestId = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchVotes = useCallback(async (after = 0) => {
    const url = after > 0 ? `/api/opepen/feed?after=${after}` : "/api/opepen/feed";
    const res = await fetch(url);
    const data = await res.json();
    return data.votes as Vote[];
  }, []);

  // Initial load
  useEffect(() => {
    fetchVotes().then((initial) => {
      setVotes(initial);
      if (initial.length > 0) latestId.current = initial[0].id;
      setLoading(false);
    });
  }, [fetchVotes]);

  // Poll for new votes every 3 seconds
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const newVotes = await fetchVotes(latestId.current);
      if (newVotes.length > 0) {
        latestId.current = newVotes[0].id;
        setVotes((prev) => [...newVotes, ...prev]);
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [fetchVotes]);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">PVP</h1>
        <p className="font-mono-caps text-xs text-neutral-500">OPEPEN LIVE FEED</p>
      </div>

      {/* Nav */}
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/opepen"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          &larr; VOTE
        </Link>
        <Link
          href="/opepen/leaderboard"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          LEADERBOARD
        </Link>
      </div>

      {/* Live indicator */}
      <div className="mb-6 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="font-mono-caps text-[10px] text-neutral-500">UPDATING LIVE</span>
      </div>

      {/* Feed */}
      <div className="w-full max-w-md">
        {loading ? (
          <div className="text-center font-mono-caps text-xs text-neutral-500">LOADING...</div>
        ) : votes.length === 0 ? (
          <div className="text-center font-mono-caps text-xs text-neutral-500">NO VOTES YET</div>
        ) : (
          <div className="flex flex-col gap-1">
            {votes.map((vote) => (
              <div
                key={vote.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-900/50 transition-colors animate-in"
              >
                {/* Winner */}
                <Link href={`/opepen/${vote.winnerId}`} className="flex items-center gap-2 group">
                  <OpepenImage opepenId={vote.winnerId} className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-mono-caps text-[10px] text-green-400 group-hover:underline">
                      #{vote.winnerId}
                    </span>
                    <span className="font-mono-caps text-[9px] text-neutral-600">
                      {vote.winnerElo}
                    </span>
                  </div>
                </Link>

                {/* Beat label */}
                <span className="font-mono-caps text-[9px] text-neutral-600 shrink-0">BEAT</span>

                {/* Loser */}
                <Link href={`/opepen/${vote.loserId}`} className="flex items-center gap-2 group">
                  <OpepenImage opepenId={vote.loserId} className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-mono-caps text-[10px] text-red-400 group-hover:underline">
                      #{vote.loserId}
                    </span>
                    <span className="font-mono-caps text-[9px] text-neutral-600">
                      {vote.loserElo}
                    </span>
                  </div>
                </Link>

                {/* Timestamp */}
                <span className="font-mono-caps text-[9px] text-neutral-700 ml-auto shrink-0">
                  {timeAgo(vote.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
