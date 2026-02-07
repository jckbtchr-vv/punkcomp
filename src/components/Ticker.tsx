"use client";

import { useEffect, useState } from "react";

interface TickerItem {
  text: string;
  punks?: number[];
}

function TickerPunk({ id }: { id: number }) {
  const col = id % 100;
  const row = Math.floor(id / 100);
  return (
    <span className="inline-block w-4 h-4 rounded-full overflow-hidden shrink-0">
      <span
        className="block punk-sprite"
        style={{
          width: "20px",
          height: "20px",
          marginTop: "-1px",
          marginLeft: "-2px",
          backgroundColor: "#638596",
          backgroundSize: "10000% 10000%",
          backgroundPosition: `${(col / 99) * 100}% ${(row / 99) * 100}%`,
        }}
      />
    </span>
  );
}

export default function Ticker() {
  const [items, setItems] = useState<TickerItem[]>([]);

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
      <div className="ticker-scroll flex whitespace-nowrap items-center py-1.5">
        {repeated.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 mx-6 shrink-0">
            {item.punks?.map((id) => (
              <TickerPunk key={id} id={id} />
            ))}
            <span className="font-mono-caps text-[10px] text-neutral-500">
              {item.text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
