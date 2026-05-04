import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple in-memory cache for image URLs (cleared on deploy)
const urlCache = new Map<number, { url: string; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getImageUrl(id: number): Promise<string | null> {
  // Check cache
  const cached = urlCache.get(id);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  try {
    const res = await fetch(`https://api.opepen.art/${id}/metadata.json`);
    if (!res.ok) return null;
    const data = await res.json();

    let image = data.image || "";
    if (!image) return null;

    // Convert to gateway URL
    if (image.startsWith("ipfs://")) {
      image = image.replace("ipfs://", "https://w3s.link/ipfs/");
    } else if (image.startsWith("ar://")) {
      image = image.replace("ar://", "https://arweave.net/");
    }

    // Cache the URL
    urlCache.set(id, { url: image, expires: Date.now() + CACHE_TTL });

    return image;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opepenId = parseInt(id);

  if (isNaN(opepenId) || opepenId < 1 || opepenId > 16000) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const imageUrl = await getImageUrl(opepenId);
  if (!imageUrl) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Redirect to the actual image with cache headers
  // Browser and CDN will cache the redirect
  return NextResponse.redirect(imageUrl, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
