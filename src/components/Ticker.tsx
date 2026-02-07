"use client";

import { useEffect, useState } from "react";

export default function Ticker() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/ticker")
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .catch(() => {});

    // Refresh every 30s for fresh stats
    const interval = setInterval(() => {
      fetch("/api/ticker")
        .then((r) => r.json())
        .then((d) => setItems(d.items))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  // Duplicate the items enough times to fill the scroll seamlessly
  const repeated = [...items, ...items];

  return (
    <div className="w-full overflow-hidden border-b border-neutral-800/50 bg-neutral-950/80">
      <div className="ticker-scroll flex whitespace-nowrap py-2">
        {repeated.map((item, i) => (
          <span key={i} className="font-mono-caps text-[10px] text-neutral-500 mx-6 shrink-0">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
