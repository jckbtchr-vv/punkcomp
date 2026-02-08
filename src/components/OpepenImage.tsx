"use client";

import { useEffect, useState } from "react";

// Cache: maps opepenId -> resolved src (local thumb or original URL)
const imageCache = new Map<number, string>();
// Track which IDs we've already reported to server
const reported = new Set<number>();

function reportImageUrl(id: number, url: string) {
  if (reported.has(id) || !url) return;
  reported.add(id);
  fetch("/api/opepen/report-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, url }),
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
  const [src, setSrc] = useState<string | null>(imageCache.get(opepenId) || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imageCache.has(opepenId)) {
      setSrc(imageCache.get(opepenId)!);
      return;
    }

    let cancelled = false;

    // Try local thumbnail first
    const localUrl = `/api/opepen/image/${opepenId}`;
    fetch(localUrl, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          imageCache.set(opepenId, localUrl);
          setSrc(localUrl);
        } else {
          // Fall back to fetching metadata from opepen API
          return fetchFromApi();
        }
      })
      .catch(() => {
        if (!cancelled) fetchFromApi();
      });

    function fetchFromApi() {
      fetch(`https://api.opepen.art/${opepenId}/metadata.json`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const url = resolveUrl(data.image || "");
          imageCache.set(opepenId, url);
          setSrc(url);
          // Report URL so server can cache a thumbnail
          reportImageUrl(opepenId, url);
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [opepenId]);

  if (!src || error) {
    return (
      <div className={`bg-neutral-800 flex items-center justify-center ${className}`}>
        <span className="font-mono-caps text-[8px] text-neutral-600">#{opepenId}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Opepen #${opepenId}`}
      className={`object-cover ${className}`}
      onError={() => {
        // If local thumb failed, try original URL
        if (src.startsWith("/api/opepen/image/")) {
          imageCache.delete(opepenId);
          setError(false);
          fetch(`https://api.opepen.art/${opepenId}/metadata.json`)
            .then((r) => r.json())
            .then((data) => {
              const url = resolveUrl(data.image || "");
              if (url) {
                imageCache.set(opepenId, url);
                setSrc(url);
                reportImageUrl(opepenId, url);
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
