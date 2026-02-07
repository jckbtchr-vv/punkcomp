import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id) || id < 0 || id > 9999) {
    return NextResponse.json({ error: "Invalid punk ID (0-9999)" }, { status: 400, headers: CORS });
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
    return NextResponse.json({ error: "Punk not found" }, { status: 404, headers: CORS });
  }

  const traits = db
    .prepare("SELECT trait FROM punk_traits WHERE punk_id = ?")
    .all(id) as { trait: string }[];

  // Compute rank
  const rank = (
    db
      .prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0 AND elo > ?")
      .get(punk.elo) as { c: number }
  ).c + 1;

  const totalRanked = (
    db.prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0").get() as { c: number }
  ).c;

  return NextResponse.json(
    {
      data: {
        id: punk.id,
        rank: punk.wins + punk.losses > 0 ? rank : null,
        totalRanked,
        elo: Math.round(punk.elo * 100) / 100,
        wins: punk.wins,
        losses: punk.losses,
        winRate: punk.wins + punk.losses > 0 ? Math.round((punk.wins / (punk.wins + punk.losses)) * 10000) / 100 : 0,
        lastSaleEth: punk.last_sale_eth,
        lastSaleDate: punk.last_sale_date,
        type: punk.type,
        gender: punk.gender,
        skinTone: punk.skin_tone,
        accessoryCount: punk.accessory_count,
        traits: traits.map((t) => t.trait).filter((t) => t !== punk.type),
      },
    },
    { headers: CORS }
  );
}
