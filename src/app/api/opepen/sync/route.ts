import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

const API_BASE = "https://api.opepen.art/v1/opepen";
const BATCH_SIZE = 50;
const SYNC_LIMIT = 500; // Sync up to 500 per request to avoid timeout

interface OpepenV1Response {
  token_id: string;
  set_id: number | null;
  image: {
    uuid: string;
    type: string;
  } | null;
  metadata: {
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  } | null;
}

function getAttr(attrs: Array<{ trait_type: string; value: string | number }>, type: string): string | null {
  const attr = attrs.find((a) => a.trait_type?.toLowerCase() === type.toLowerCase());
  return attr?.value?.toString() || null;
}

async function fetchOpepen(id: number): Promise<OpepenV1Response | null> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Optional auth check via query param
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get IDs that need syncing
  const needSync = db.prepare(
    "SELECT id FROM opepen WHERE set_id IS NULL ORDER BY id LIMIT ?"
  ).all(SYNC_LIMIT) as { id: number }[];

  if (needSync.length === 0) {
    const total = db.prepare("SELECT COUNT(*) as c FROM opepen").get() as { c: number };
    return NextResponse.json({
      message: "All opepen synced",
      total: total.c,
      remaining: 0
    });
  }

  const update = db.prepare(`
    UPDATE opepen SET
      set_id = ?,
      set_name = ?,
      artist = ?,
      image_group = ?,
      edition_size = ?,
      image_url = ?
    WHERE id = ?
  `);

  let synced = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < needSync.length; i += BATCH_SIZE) {
    const batchIds = needSync.slice(i, i + BATCH_SIZE).map((r) => r.id);

    // Fetch in parallel
    const results = await Promise.all(batchIds.map((id) => fetchOpepen(id)));

    const transaction = db.transaction(() => {
      for (let j = 0; j < batchIds.length; j++) {
        const id = batchIds[j];
        const data = results[j];

        if (!data) {
          errors++;
          // Mark as synced with null set_id = -1 to skip next time
          update.run(-1, null, null, null, 1, null, id);
          continue;
        }

        const attrs = data.metadata?.attributes || [];
        const setName = getAttr(attrs, "Set");
        const artist = getAttr(attrs, "Artist");
        const editionStr = getAttr(attrs, "Edition Size");
        const imageGroup = data.image?.uuid || null;

        // Parse edition size
        let editionSize = 1;
        if (editionStr) {
          const editionMap: Record<string, number> = {
            one: 1,
            four: 4,
            five: 5,
            ten: 10,
            twenty: 20,
            forty: 40,
          };
          editionSize = editionMap[editionStr.toLowerCase()] || parseInt(editionStr) || 1;
        }

        // Build image URL from image data
        let imageUrl: string | null = null;
        if (data.image?.uuid && data.image?.type) {
          imageUrl = `https://opepenai.nyc3.digitaloceanspaces.com/images/${data.image.uuid}/sm.${data.image.type}`;
        }

        update.run(
          data.set_id || 0,
          setName,
          artist,
          imageGroup,
          editionSize,
          imageUrl,
          id
        );
        synced++;
      }
    });

    transaction();
  }

  // Count remaining
  const remaining = db.prepare(
    "SELECT COUNT(*) as c FROM opepen WHERE set_id IS NULL"
  ).get() as { c: number };

  return NextResponse.json({
    synced,
    errors,
    remaining: remaining.c,
    message: remaining.c > 0 ? `${remaining.c} opepen still need syncing` : "All opepen synced"
  });
}
