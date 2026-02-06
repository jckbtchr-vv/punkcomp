"use client";

// The sprite sheet is 2400x2400 containing 100x100 grid of 24x24 pixel punks.
// Punk #N: row = floor(N/100), col = N%100

export default function PunkImage({
  punkId,
  size = 192,
}: {
  punkId: number;
  size?: number;
}) {
  const col = punkId % 100;
  const row = Math.floor(punkId / 100);
  const scale = size / 24;

  return (
    <div
      className="punk-sprite"
      style={{
        width: size,
        height: size,
        backgroundSize: `${2400 * scale}px ${2400 * scale}px`,
        backgroundPosition: `-${col * size}px -${row * size}px`,
      }}
      title={`Punk #${punkId}`}
    />
  );
}
