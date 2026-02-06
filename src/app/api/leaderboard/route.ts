import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const db = getDb();

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

  // Compute percentile ranks for dislocation calculation
  // Elo percentile: where does this punk's elo sit among all voted punks?
  // Price percentile: where does this punk's price sit among all punks with prices?
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
    // Dislocation: positive = aesthetically undervalued (elo rank > price rank)
    // negative = overvalued (price rank > elo rank)
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
    page,
    totalPages: Math.ceil(total.c / limit),
  });
}
