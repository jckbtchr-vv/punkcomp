import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const search = url.searchParams.get("search")?.trim() || "";
  const limit = 50;
  const offset = (page - 1) * limit;

  const db = getDb();

  // If searching, look up the specific punk (show even if unvoted)
  if (search) {
    const punkId = parseInt(search);
    if (isNaN(punkId) || punkId < 0 || punkId > 9999) {
      return NextResponse.json({ punks: [], total: 0, totalVotes: 0, page: 1, totalPages: 0, eloMin: 1500, eloMax: 1500 });
    }

    const punk = db
      .prepare("SELECT id, elo, wins, losses, last_sale_eth FROM punks WHERE id = ?")
      .get(punkId) as { id: number; elo: number; wins: number; losses: number; last_sale_eth: number | null } | undefined;

    const totalVotes = db.prepare("SELECT COUNT(*) as c FROM votes").get() as { c: number };
    const totalVoters = db.prepare("SELECT COUNT(DISTINCT voter_ip) as c FROM votes WHERE voter_ip IS NOT NULL").get() as { c: number };

    if (!punk) {
      return NextResponse.json({ punks: [], total: 0, totalVotes: totalVotes.c, totalVoters: totalVoters.c, page: 1, totalPages: 0, eloMin: 1500, eloMax: 1500 });
    }

    return NextResponse.json({
      punks: [{ ...punk, dislocation: null }],
      total: 1,
      totalVotes: totalVotes.c,
      totalVoters: totalVoters.c,
      page: 1,
      totalPages: 1,
      eloMin: punk.elo,
      eloMax: punk.elo,
    });
  }

  const punks = db
    .prepare(
      `SELECT id, elo, wins, losses, last_sale_eth
       FROM punks WHERE wins + losses > 0
       ORDER BY elo DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as {
    id: number;
    elo: number;
    wins: number;
    losses: number;
    last_sale_eth: number | null;
  }[];

  const total = db
    .prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0")
    .get() as { c: number };

  const totalVotes = db
    .prepare("SELECT COUNT(*) as c FROM votes")
    .get() as { c: number };

  const totalVoters = db
    .prepare("SELECT COUNT(DISTINCT voter_ip) as c FROM votes WHERE voter_ip IS NOT NULL")
    .get() as { c: number };

  // Global elo range for bar normalization
  const eloRange = db
    .prepare("SELECT MIN(elo) as min, MAX(elo) as max FROM punks WHERE wins + losses > 0")
    .get() as { min: number; max: number } | undefined;

  // Compute percentile ranks for dislocation calculation
  const eloRanks = db
    .prepare(
      `SELECT id, elo,
              PERCENT_RANK() OVER (ORDER BY elo ASC) as elo_pctile
       FROM punks WHERE wins + losses > 0`
    )
    .all() as { id: number; elo: number; elo_pctile: number }[];

  const priceRanks = db
    .prepare(
      `SELECT id, last_sale_eth,
              PERCENT_RANK() OVER (ORDER BY last_sale_eth ASC) as price_pctile
       FROM punks WHERE last_sale_eth IS NOT NULL`
    )
    .all() as { id: number; last_sale_eth: number; price_pctile: number }[];

  const eloMap = new Map(eloRanks.map((r) => [r.id, r.elo_pctile]));
  const priceMap = new Map(priceRanks.map((r) => [r.id, r.price_pctile]));

  const enriched = punks.map((p) => {
    const eloPctile = eloMap.get(p.id) ?? null;
    const pricePctile = priceMap.get(p.id) ?? null;
    const dislocation =
      eloPctile !== null && pricePctile !== null
        ? Math.round((eloPctile - pricePctile) * 100)
        : null;

    return {
      ...p,
      dislocation,
    };
  });

  return NextResponse.json({
    punks: enriched,
    total: total.c,
    totalVotes: totalVotes.c,
    totalVoters: totalVoters.c,
    page,
    totalPages: Math.ceil(total.c / limit),
    eloMin: eloRange?.min ?? 1500,
    eloMax: eloRange?.max ?? 1500,
  });
}
