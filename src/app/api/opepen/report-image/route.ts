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

  if (edition && edition > 0) {
    db.prepare(
      "UPDATE opepen SET image_url = ?, image_group = ?, edition_size = ? WHERE id = ? AND image_url IS NULL"
    ).run(url, group, edition, id);
  } else {
    db.prepare(
      "UPDATE opepen SET image_url = ?, image_group = ? WHERE id = ? AND image_url IS NULL"
    ).run(url, group, id);
  }

  return NextResponse.json({ ok: true });
}
