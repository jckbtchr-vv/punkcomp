"use client";

import { useEffect, useState } from "react";

const imageCache = new Map<number, string>();

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
    fetch(`https://api.opepen.art/${opepenId}/metadata.json`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        let url = data.image || "";
        if (url.startsWith("ipfs://")) {
          url = url.replace("ipfs://", "https://ipfs.io/ipfs/");
        } else if (url.startsWith("ar://")) {
          url = url.replace("ar://", "https://arweave.net/");
        }
        imageCache.set(opepenId, url);
        setSrc(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [opepenId]);

  if (!src || error) {
    return (
      <div className={`bg-neutral-800 flex items-center justify-center ${className}`}>
        <span className="font-mono-caps text-[8px] text-neutral-600">#{opepenId}</span>
      </div>
    );
  }

  // For SVG data URIs or SVG URLs, use an object tag as fallback if img fails
  return (
    <img
      src={src}
      alt={`Opepen #${opepenId}`}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
