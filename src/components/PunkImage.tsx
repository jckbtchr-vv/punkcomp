"use client";

// The sprite sheet is 2400x2400 containing 100x100 grid of 24x24 pixel punks.
// Punk #N: row = floor(N/100), col = N%100
// Using percentage-based background-position so the sprite scales with any container size.

const PUNK_BG = "#638596";

export default function PunkImage({
  punkId,
  className,
}: {
  punkId: number;
  className?: string;
}) {
  const col = punkId % 100;
  const row = Math.floor(punkId / 100);

  return (
    <div
      className={`punk-sprite aspect-square ${className || ""}`}
      style={{
        backgroundColor: PUNK_BG,
        backgroundSize: "10000% 10000%",
        backgroundPosition: `${(col / 99) * 100}% ${(row / 99) * 100}%`,
      }}
      title={`Punk #${punkId}`}
    />
  );
}
