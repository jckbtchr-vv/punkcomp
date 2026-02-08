import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function normalizeImageUrl(url: string): string {
  // Strip query params and fragments to group identical images
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

export async function POST(req: NextRequest) {
  let id: number, url: string, edition: number | undefined;
  try {
    const body = await req.json();
    id = body.id;
    url = body.url;
    edition = typeof body.edition === "number" ? body.edition : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof id !== "number" || id < 1 || id > 16000 || typeof url !== "string" || !url) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  // Only accept http(s) URLs
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const db = getDb();
  const group = normalizeImageUrl(url);

  // Set image_url + image_group on first report
  db.prepare(
    "UPDATE opepen SET image_url = ?, image_group = ? WHERE id = ? AND image_url IS NULL"
  ).run(url, group, id);

  // Always backfill edition_size if we have it and it's missing
  if (edition && edition > 0) {
    db.prepare(
      "UPDATE opepen SET edition_size = ? WHERE id = ? AND edition_size IS NULL"
    ).run(edition, id);
    // Also propagate edition_size to all siblings in the same image group
    db.prepare(
      "UPDATE opepen SET edition_size = ? WHERE image_group = ? AND edition_size IS NULL"
    ).run(edition, group);
  }

  return NextResponse.json({ ok: true });
}
