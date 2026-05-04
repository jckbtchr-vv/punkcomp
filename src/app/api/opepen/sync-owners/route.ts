import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const API_BASE = "https://api.opepen.art/v1/opepen";
const BATCH_SIZE = 50;
const SYNC_LIMIT = 500;

async function fetchOwner(id: number): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.owner || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get opepen that have set_id but no owner
  const needSync = db.prepare(
    "SELECT id FROM opepen WHERE set_id IS NOT NULL AND set_id > 0 AND (owner IS NULL OR owner = '') ORDER BY id LIMIT ?"
  ).all(SYNC_LIMIT) as { id: number }[];

  if (needSync.length === 0) {
    return NextResponse.json({
      message: "All owners synced",
      remaining: 0
    });
  }

  const update = db.prepare("UPDATE opepen SET owner = ? WHERE id = ?");

  let synced = 0;

  for (let i = 0; i < needSync.length; i += BATCH_SIZE) {
    const batchIds = needSync.slice(i, i + BATCH_SIZE).map((r) => r.id);
    const results = await Promise.all(batchIds.map((id) => fetchOwner(id)));

    const transaction = db.transaction(() => {
      for (let j = 0; j < batchIds.length; j++) {
        const owner = results[j];
        if (owner) {
          update.run(owner, batchIds[j]);
          synced++;
        }
      }
    });

    transaction();
  }

  const remaining = db.prepare(
    "SELECT COUNT(*) as c FROM opepen WHERE set_id IS NOT NULL AND set_id > 0 AND (owner IS NULL OR owner = '')"
  ).get() as { c: number };

  return NextResponse.json({
    synced,
    remaining: remaining.c,
    message: remaining.c > 0 ? `${remaining.c} owners still need syncing` : "All owners synced"
  });
}
