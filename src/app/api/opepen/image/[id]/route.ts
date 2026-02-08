import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const THUMB_DIR = path.join(process.env.DATA_DIR || process.cwd(), "opepen-thumbs");
const THUMB_SIZE = 256;

// Ensure thumb directory exists
if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id) || id < 1 || id > 16000) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const thumbPath = path.join(THUMB_DIR, `${id}.webp`);

  // Serve from disk cache
  if (fs.existsSync(thumbPath)) {
    const buf = fs.readFileSync(thumbPath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  // Look up image URL from DB
  const db = getDb();
  const row = db.prepare("SELECT image_url FROM opepen WHERE id = ?").get(id) as {
    image_url: string | null;
  } | undefined;

  if (!row?.image_url) {
    return new NextResponse("Not cached yet", { status: 404 });
  }

  // Fetch and resize
  try {
    const res = await fetch(row.image_url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return new NextResponse("Upstream error", { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "";
    const arrayBuf = await res.arrayBuffer();
    const inputBuf = Buffer.from(arrayBuf);

    let webpBuf: Buffer;

    // Handle SVG: sharp can convert SVG to webp
    if (contentType.includes("svg") || row.image_url.endsWith(".svg")) {
      webpBuf = await sharp(inputBuf, { density: 150 })
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      webpBuf = await sharp(inputBuf)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();
    }

    // Cache to disk
    fs.writeFileSync(thumbPath, webpBuf);

    return new NextResponse(new Uint8Array(webpBuf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("Failed to process image", { status: 502 });
  }
}
