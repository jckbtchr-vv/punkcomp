import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPunkMarketData, getFloorPrice } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id) || id < 0 || id > 9999) {
    return NextResponse.json({ error: "Invalid punk ID" }, { status: 400 });
  }

  const db = getDb();

  const punk = db
    .prepare(
      "SELECT id, elo, wins, losses, last_sale_eth, last_sale_date, type, gender, skin_tone, accessory_count FROM punks WHERE id = ?"
    )
    .get(id) as {
    id: number;
    elo: number;
    wins: number;
    losses: number;
    last_sale_eth: number | null;
    last_sale_date: string | null;
    type: string | null;
    gender: string | null;
    skin_tone: string | null;
    accessory_count: number | null;
  } | undefined;

  if (!punk) {
    return NextResponse.json({ error: "Punk not found" }, { status: 404 });
  }

  const traits = db
    .prepare("SELECT trait FROM punk_traits WHERE punk_id = ?")
    .all(id) as { trait: string }[];

  // Compute rank
  const rank =
    punk.wins + punk.losses > 0
      ? (
          db
            .prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0 AND elo > ?")
            .get(punk.elo) as { c: number }
        ).c + 1
      : null;

  const totalRanked = (
    db.prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0").get() as { c: number }
  ).c;

  // Get vote history (wins and losses)
  const votes = db
    .prepare(
      `SELECT id, winner_id, loser_id, created_at FROM votes
       WHERE winner_id = ? OR loser_id = ?
       ORDER BY id DESC
       LIMIT 100`
    )
    .all(id, id) as {
    id: number;
    winner_id: number;
    loser_id: number;
    created_at: string;
  }[];

  const history = votes.map((v) => ({
    id: v.id,
    won: v.winner_id === id,
    opponentId: v.winner_id === id ? v.loser_id : v.winner_id,
    createdAt: v.created_at,
  }));

  // Fetch market data from cryptopunks.app (cached)
  const [marketData, floorPrice] = await Promise.all([
    getPunkMarketData(id),
    getFloorPrice(),
  ]);

  // Calculate floor comparison
  let floorComparison: { percent: number; label: string } | null = null;
  if (punk.last_sale_eth && floorPrice) {
    const diff = ((punk.last_sale_eth - floorPrice) / floorPrice) * 100;
    floorComparison = {
      percent: Math.round(diff),
      label: diff >= 0 ? `${Math.round(diff)}% above floor` : `${Math.round(Math.abs(diff))}% below floor`,
    };
  }

  return NextResponse.json({
    punk: {
      id: punk.id,
      rank,
      totalRanked,
      elo: Math.round(punk.elo * 100) / 100,
      wins: punk.wins,
      losses: punk.losses,
      winRate:
        punk.wins + punk.losses > 0
          ? Math.round((punk.wins / (punk.wins + punk.losses)) * 10000) / 100
          : 0,
      lastSaleEth: punk.last_sale_eth,
      lastSaleDate: punk.last_sale_date,
      type: punk.type,
      gender: punk.gender,
      skinTone: punk.skin_tone,
      accessoryCount: punk.accessory_count,
      traits: traits.map((t) => t.trait).filter((t) => t !== punk.type),
    },
    market: marketData ? {
      owner: marketData.owner,
      ownerEns: marketData.ownerEns,
      isForSale: marketData.isForSale,
      listingPrice: marketData.listingPrice,
      hasBid: marketData.hasBid,
      bidPrice: marketData.bidPrice,
    } : null,
    floor: floorPrice,
    floorComparison,
    history,
  });
}
