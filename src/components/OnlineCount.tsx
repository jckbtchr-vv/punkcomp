"use client";

import { useEffect, useState } from "react";

export default function OnlineCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const ping = () =>
      fetch("/api/presence", { method: "POST" })
        .then((r) => r.json())
        .then((d) => setCount(d.online))
        .catch(() => {});

    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed top-2 left-3 z-50 flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="font-mono-caps text-[10px] text-neutral-500">
        {count} ONLINE
      </span>
    </div>
  );
}
