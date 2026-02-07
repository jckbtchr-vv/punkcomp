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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const db = getDb();

  const punks = db
    .prepare(
      `SELECT id, elo, wins, losses, last_sale_eth, type, skin_tone, accessory_count
       FROM punks WHERE wins + losses > 0
       ORDER BY elo DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as {
    id: number;
    elo: number;
    wins: number;
    losses: number;
    last_sale_eth: number | null;
    type: string | null;
    skin_tone: string | null;
    accessory_count: number | null;
  }[];

  const total = (
    db.prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0").get() as { c: number }
  ).c;

  const ranked = punks.map((p, i) => ({
    id: p.id,
    rank: offset + i + 1,
    elo: Math.round(p.elo * 100) / 100,
    wins: p.wins,
    losses: p.losses,
    winRate: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 10000) / 100 : 0,
    lastSaleEth: p.last_sale_eth,
    type: p.type,
    skinTone: p.skin_tone,
    accessoryCount: p.accessory_count,
  }));

  return NextResponse.json(
    {
      data: ranked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    { headers: CORS }
  );
}
