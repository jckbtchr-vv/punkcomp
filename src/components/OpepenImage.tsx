"use client";

import { useEffect, useState } from "react";

// Cache: maps opepenId -> resolved src (local thumb or original URL)
const imageCache = new Map<number, string>();
// Track which IDs we've already reported to server
const reported = new Set<number>();

function reportImageUrl(
  id: number,
  url: string,
  edition?: number,
  setId?: number,
  setName?: string,
  artist?: string
) {
  if (reported.has(id) || !url) return;
  reported.add(id);
  const body: {
    id: number;
    url: string;
    edition?: number;
    setId?: number;
    setName?: string;
    artist?: string;
  } = { id, url };
  if (edition && edition > 0) body.edition = edition;
  if (setId && setId > 0) {
    body.setId = setId;
    if (setName) body.setName = setName;
    if (artist) body.artist = artist;
  }
  fetch("/api/opepen/report-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function resolveUrl(url: string): string {
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://")) return url.replace("ar://", "https://arweave.net/");
  return url;
}

export default function OpepenImage({
  opepenId,
  className = "",
}: {
  opepenId: number;
  className?: string;
}) {
  // Start with local thumbnail URL - the img onError handles fallback
  const cached = imageCache.get(opepenId);
  const [src, setSrc] = useState<string | null>(cached || `/api/opepen/image/${opepenId}`);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we already have a known-good URL, use it
    if (imageCache.has(opepenId)) {
      setSrc(imageCache.get(opepenId)!);
      setError(false);
    }
  }, [opepenId]);

  if (error) {
    return (
      <div className={`bg-neutral-800 flex items-center justify-center ${className}`}>
        <span className="font-mono-caps text-[8px] text-neutral-600">#{opepenId}</span>
      </div>
    );
  }

  return (
    <img
      src={src || undefined}
      alt={`Opepen #${opepenId}`}
      className={`object-cover ${className}`}
      onError={() => {
        if (src?.startsWith("/api/opepen/image/")) {
          // Local thumb not cached yet - fetch metadata from external API
          fetch(`https://api.opepen.art/${opepenId}/metadata.json`)
            .then((r) => r.json())
            .then((data) => {
              const url = resolveUrl(data.image || "");
              if (url) {
                imageCache.set(opepenId, url);
                setSrc(url);
                // Parse attributes
                const attrs = data.attributes || [];
                const editionAttr = attrs.find((a: { trait_type: string }) =>
                  a.trait_type?.toLowerCase() === "edition size"
                );
                const releaseAttr = attrs.find((a: { trait_type: string }) =>
                  a.trait_type?.toLowerCase() === "release"
                );
                const setAttr = attrs.find((a: { trait_type: string }) =>
                  a.trait_type?.toLowerCase() === "set"
                );
                const artistAttr = attrs.find((a: { trait_type: string }) =>
                  a.trait_type?.toLowerCase() === "artist"
                );
                const edition = editionAttr ? parseInt(editionAttr.value) : undefined;
                const setId = releaseAttr ? parseInt(releaseAttr.value) : undefined;
                const setName = setAttr?.value;
                const artist = artistAttr?.value;
                reportImageUrl(opepenId, url, edition, setId, setName, artist);
              } else {
                setError(true);
              }
            })
            .catch(() => setError(true));
        } else {
          setError(true);
        }
      }}
    />
  );
}
