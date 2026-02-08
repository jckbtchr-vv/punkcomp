"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OnlineCount() {
  const [totalVotes, setTotalVotes] = useState<number | null>(null);

  useEffect(() => {
    const ping = () =>
      fetch("/api/presence", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.totalVotes === "number") setTotalVotes(d.totalVotes);
        })
        .catch(() => {});

    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Increment instantly when a vote is cast on this page
  useEffect(() => {
    const onVote = () => setTotalVotes((v) => (v !== null ? v + 1 : v));
    window.addEventListener("vote", onVote);
    return () => window.removeEventListener("vote", onVote);
  }, []);

  if (totalVotes === null || totalVotes === 0) return null;

  return (
    <Link href="/feed" className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 hover:opacity-80 transition-opacity">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="font-mono-caps text-[10px] text-neutral-500">
        {totalVotes.toLocaleString()} VOTES
      </span>
    </Link>
  );
}
