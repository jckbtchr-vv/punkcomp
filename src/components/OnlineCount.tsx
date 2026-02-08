"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function timeAgo(dateStr: string): string {
  // SQLite datetime('now') stores UTC without Z suffix; ensure we parse as UTC
  const utcStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const seconds = Math.floor((Date.now() - new Date(utcStr).getTime()) / 1000);
  if (seconds < 5) return "JUST NOW";
  if (seconds < 60) return `${seconds}s AGO`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h AGO`;
  const days = Math.floor(hours / 24);
  return `${days}d AGO`;
}

export default function OnlineCount() {
  const [lastVoteAt, setLastVoteAt] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const ping = () =>
      fetch("/api/presence", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d.lastVoteAt) setLastVoteAt(d.lastVoteAt);
        })
        .catch(() => {});

    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Re-render every second so the relative time stays fresh
  useEffect(() => {
    if (!lastVoteAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(interval);
  }, [lastVoteAt]);

  if (!lastVoteAt) return null;

  return (
    <Link href="/feed" className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 hover:opacity-80 transition-opacity">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="font-mono-caps text-[10px] text-neutral-500">
        LAST VOTE {timeAgo(lastVoteAt)}
      </span>
    </Link>
  );
}
