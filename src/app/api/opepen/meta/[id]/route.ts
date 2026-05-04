import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opepenId = parseInt(id);

  if (isNaN(opepenId) || opepenId < 1 || opepenId > 16000) {
    return NextResponse.json({ error: "Invalid opepen ID" }, { status: 400 });
  }

  const db = getDb();

  const opepen = db.prepare(`
    SELECT id, set_id, set_name, artist, edition_size, image_url, image_group
    FROM opepen WHERE id = ?
  `).get(opepenId) as {
    id: number;
    set_id: number | null;
    set_name: string | null;
    artist: string | null;
    edition_size: number | null;
    image_url: string | null;
    image_group: string | null;
  } | undefined;

  if (!opepen) {
    return NextResponse.json({ error: "Opepen not found" }, { status: 404 });
  }

  // If we have cached data, return it
  if (opepen.image_url && opepen.set_id && opepen.set_id > 0) {
    return NextResponse.json({
      id: opepen.id,
      name: `${opepen.set_name || `Set ${opepen.set_id}`}`,
      image: opepen.image_url,
      set: opepen.set_id?.toString() || null,
      setId: opepen.set_id,
      artist: opepen.artist,
      edition: opepen.edition_size?.toString() || "1",
      revealed: true,
      cached: true,
    });
  }

  // Not synced yet - return minimal data, client will fetch from external API
  return NextResponse.json({
    id: opepen.id,
    cached: false,
  });
}
