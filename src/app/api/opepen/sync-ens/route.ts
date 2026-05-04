import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 20;

async function resolveEns(address: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.name || null;
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

  // Get top collectors by opepen count that don't have ENS cached
  const needResolve = db.prepare(`
    SELECT DISTINCT o.owner as address
    FROM opepen o
    LEFT JOIN opepen_ens e ON LOWER(o.owner) = LOWER(e.address)
    WHERE o.owner IS NOT NULL
      AND o.owner != ''
      AND e.address IS NULL
    GROUP BY o.owner
    ORDER BY COUNT(*) DESC
    LIMIT ?
  `).all(BATCH_SIZE) as { address: string }[];

  if (needResolve.length === 0) {
    return NextResponse.json({
      message: "All ENS names resolved",
      resolved: 0
    });
  }

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO opepen_ens (address, ens_name, updated_at)
    VALUES (LOWER(?), ?, datetime('now'))
  `);

  let resolved = 0;
  let withEns = 0;

  // Resolve sequentially to avoid rate limiting
  for (const { address } of needResolve) {
    const ens = await resolveEns(address);
    upsert.run(address, ens);
    resolved++;
    if (ens) withEns++;
  }

  // Count remaining
  const remaining = db.prepare(`
    SELECT COUNT(DISTINCT o.owner) as c
    FROM opepen o
    LEFT JOIN opepen_ens e ON LOWER(o.owner) = LOWER(e.address)
    WHERE o.owner IS NOT NULL
      AND o.owner != ''
      AND e.address IS NULL
  `).get() as { c: number };

  return NextResponse.json({
    resolved,
    withEns,
    remaining: remaining.c,
    message: remaining.c > 0 ? `${remaining.c} addresses still need ENS lookup` : "All ENS names resolved"
  });
}
