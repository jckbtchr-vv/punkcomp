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
    <span
      className="inline-block w-4 h-4 rounded-full shrink-0 punk-sprite"
      style={{
        backgroundColor: "#638596",
        backgroundSize: "10000% 10000%",
        backgroundPosition: `${(col / 99) * 100}% ${(row / 99) * 100}%`,
      }}
    />
  );
}

function TickerTrack({ items }: { items: TickerItem[] }) {
  return (
    <div className="ticker-track flex whitespace-nowrap items-center shrink-0">
      {items.map((item, i) => (
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
  );
}

export default function Ticker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch("/api/ticker")
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/ticker")
        .then((r) => r.json())
        .then((d) => setItems(d.items))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="w-full overflow-hidden border-b border-neutral-800/50 bg-neutral-950/80">
      <div className="flex py-1.5">
        <TickerTrack items={items} />
        <TickerTrack items={items} />
      </div>
    </div>
  );
}
