import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  let id: number, url: string;
  try {
    const body = await req.json();
    id = body.id;
    url = body.url;
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
  db.prepare("UPDATE opepen SET image_url = ? WHERE id = ? AND image_url IS NULL").run(url, id);

  return NextResponse.json({ ok: true });
}
