"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface OpepenMeta {
  id: number;
  name: string;
  image: string;
  set: string | null;
  edition: string | null;
  revealed: boolean;
}

const reportedIds = new Set<number>();
function reportImage(id: number, url: string, edition?: number) {
  if (reportedIds.has(id) || !url.startsWith("http")) return;
  reportedIds.add(id);
  const body: { id: number; url: string; edition?: number } = { id, url };
  if (edition && edition > 0) body.edition = edition;
  fetch("/api/opepen/report-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function fetchOpepenMeta(id: number): Promise<OpepenMeta | null> {
  try {
    const res = await fetch(`https://api.opepen.art/${id}/metadata.json`);
    if (!res.ok) return null;
    const data = await res.json();

    const attrs = data.attributes || [];
    const setAttr = attrs.find((a: { trait_type: string }) =>
      a.trait_type?.toLowerCase() === "set" || a.trait_type?.toLowerCase() === "release"
    );
    const editionAttr = attrs.find((a: { trait_type: string }) =>
      a.trait_type?.toLowerCase() === "edition size"
    );

    // Check if revealed: unrevealed opepen typically have no image or a placeholder name
    const name = data.name || "";
    const image = data.image || "";
    const isUnrevealed = !image || name.toLowerCase().includes("unrevealed") || image.includes("unrevealed");

    // Convert IPFS/Arweave URLs to gateway URLs
    let resolvedImage = image;
    if (resolvedImage.startsWith("ipfs://")) {
      resolvedImage = resolvedImage.replace("ipfs://", "https://ipfs.io/ipfs/");
    } else if (resolvedImage.startsWith("ar://")) {
      resolvedImage = resolvedImage.replace("ar://", "https://arweave.net/");
    }

    return {
      id,
      name,
      image: resolvedImage,
      set: setAttr?.value?.toString() || null,
      edition: editionAttr?.value || null,
      revealed: !isUnrevealed,
    };
  } catch {
    return null;
  }
}

export default function OpepenVotePage() {
  const [opepen1, setOpepen1] = useState<OpepenMeta | null>(null);
  const [opepen2, setOpepen2] = useState<OpepenMeta | null>(null);
  const [matchupToken, setMatchupToken] = useState("");
  const [ready, setReady] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [selected, setSelected] = useState<"left" | "right" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMatchup = useCallback(async () => {
    setReady(false);
    setSelected(null);
    setLoading(true);
    setError(false);

    // Keep trying until we get two revealed opepen from different sets
    let attempts = 0;
    while (attempts < 20) {
      attempts++;
      try {
        const res = await fetch("/api/opepen/matchup");
        if (!res.ok) continue;
        const data = await res.json();

        const [meta1, meta2] = await Promise.all([
          fetchOpepenMeta(data.opepen1),
          fetchOpepenMeta(data.opepen2),
        ]);

        if (
          meta1 && meta2 &&
          meta1.revealed && meta2.revealed &&
          meta1.set !== meta2.set &&
          meta1.image !== meta2.image
        ) {
          setOpepen1(meta1);
          setOpepen2(meta2);
          setMatchupToken(data.token);
          setReady(true);
          setLoading(false);
          // Report image URLs so server can build thumbnail cache
          if (meta1.image) reportImage(meta1.id, meta1.image, meta1.edition ? parseInt(meta1.edition) : undefined);
          if (meta2.image) reportImage(meta2.id, meta2.image, meta2.edition ? parseInt(meta2.edition) : undefined);
          return;
        }
      } catch {
        // Network error on this attempt, try again
        continue;
      }
    }

    // All attempts failed
    setLoading(false);
    setError(true);
  }, []);

  useEffect(() => {
    fetchMatchup();
  }, [fetchMatchup]);

  const vote = async (winnerId: number, loserId: number, side: "left" | "right") => {
    if (voting || !ready) return;
    setSelected(side);
    setVoting(true);
    try {
      await fetch("/api/opepen/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId, token: matchupToken }),
      });
      setVoteCount((c) => c + 1);
    } catch {
      // Vote failed, still advance to next matchup
    } finally {
      setVoting(false);
      fetchMatchup();
    }
  };

  // Keyboard voting
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!opepen1 || !opepen2) return;
      if (e.key === "ArrowLeft") vote(opepen1.id, opepen2.id, "left");
      else if (e.key === "ArrowRight") vote(opepen2.id, opepen1.id, "right");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const busy = !ready || voting;

  const cardClass = (side: "left" | "right") => {
    const isSelected = selected === side;
    return `group flex flex-col items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-150 cursor-pointer disabled:cursor-default ${
      isSelected
        ? "border-green-500 bg-green-500/10"
        : "border-neutral-800 hover:border-green-500 hover:bg-green-500/5"
    } ${busy ? "opacity-50 pointer-events-none" : ""}`;
  };

  return (
    <main
      className="relative flex flex-col items-center justify-center px-4"
      style={{ height: "calc(100dvh - 28px)", overflow: "hidden" }}
    >
      {/* Top nav */}
      <Link
        href="/"
        className="absolute top-4 left-4 font-mono-caps text-[10px] text-neutral-600 hover:text-white border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded-lg transition-colors"
      >
        &larr; PUNKS
      </Link>

      <Link
        href="/opepen/leaderboard"
        className="absolute top-4 right-4 font-mono-caps text-[10px] text-green-500 hover:text-green-400 border border-green-500/50 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors"
      >
        LEADERBOARD &rarr;
      </Link>

      {/* Header */}
      <div className="mb-8 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PVP
        </h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          WHICH OPEPEN LOOKS BETTER?
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 280 }}>
          <span className="font-mono-caps text-xs text-neutral-500">FAILED TO LOAD MATCHUP</span>
          <button
            onClick={fetchMatchup}
            className="font-mono-caps text-xs text-green-500 hover:text-green-400 border border-green-500/50 hover:border-green-400 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            RETRY
          </button>
        </div>
      ) : (
        <>
          {/* Matchup */}
          <div
            className="flex flex-row items-center gap-4 sm:gap-12"
            style={{ minHeight: 280 }}
          >
            {/* Left card */}
            <button
              onClick={() => opepen1 && opepen2 && vote(opepen1.id, opepen2.id, "left")}
              disabled={busy}
              className={cardClass("left")}
            >
              <div className="w-[140px] sm:w-[192px] aspect-square rounded-lg overflow-hidden bg-neutral-900">
                {opepen1 && !loading && (
                  <img
                    src={opepen1.image}
                    alt={opepen1.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                {loading ? (
                  <span className="font-mono-caps text-[10px] text-neutral-600">
                    LOADING...
                  </span>
                ) : opepen1 ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono-caps text-xs font-bold transition-colors ${
                        selected === "left" ? "text-green-400" : "text-neutral-400 group-hover:text-green-400"
                      }`}>
                        #{opepen1.id}
                      </span>
                      {opepen1.edition && parseInt(opepen1.edition) > 1 && (
                        <span className="font-mono-caps text-[9px] text-neutral-600">
                          +{parseInt(opepen1.edition) - 1}
                        </span>
                      )}
                    </div>
                    {opepen1.set && (
                      <span className="font-mono-caps text-[9px] text-neutral-600">
                        SET {opepen1.set}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </button>

            {/* Right card */}
            <button
              onClick={() => opepen1 && opepen2 && vote(opepen2.id, opepen1.id, "right")}
              disabled={busy}
              className={cardClass("right")}
            >
              <div className="w-[140px] sm:w-[192px] aspect-square rounded-lg overflow-hidden bg-neutral-900">
                {opepen2 && !loading && (
                  <img
                    src={opepen2.image}
                    alt={opepen2.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                {loading ? (
                  <span className="font-mono-caps text-[10px] text-neutral-600">
                    LOADING...
                  </span>
                ) : opepen2 ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono-caps text-xs font-bold transition-colors ${
                        selected === "right" ? "text-green-400" : "text-neutral-400 group-hover:text-green-400"
                      }`}>
                        #{opepen2.id}
                      </span>
                      {opepen2.edition && parseInt(opepen2.edition) > 1 && (
                        <span className="font-mono-caps text-[9px] text-neutral-600">
                          +{parseInt(opepen2.edition) - 1}
                        </span>
                      )}
                    </div>
                    {opepen2.set && (
                      <span className="font-mono-caps text-[9px] text-neutral-600">
                        SET {opepen2.set}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </button>
          </div>

          {/* Skip */}
          <div className="mt-8 h-6 flex items-center">
            <button
              onClick={fetchMatchup}
              disabled={busy}
              className="font-mono-caps text-neutral-600 hover:text-neutral-400 text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
            >
              skip &rarr;
            </button>
          </div>

          {/* Vote count */}
          <div className="mt-12 h-8 flex items-center justify-center">
            <p className={`font-mono-caps text-[10px] text-neutral-600 ${voteCount > 0 ? "visible" : "invisible"}`}>
              {voteCount} vote{voteCount !== 1 ? "s" : ""} this session
            </p>
          </div>
        </>
      )}
    </main>
  );
}
