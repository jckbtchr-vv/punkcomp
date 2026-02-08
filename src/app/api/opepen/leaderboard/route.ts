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

  if (search) {
    const opepenId = parseInt(search);
    if (isNaN(opepenId) || opepenId < 1 || opepenId > 16000) {
      return NextResponse.json({ opepen: [], total: 0, totalVotes: 0, page: 1, totalPages: 0, eloMin: 1500, eloMax: 1500 });
    }

    const op = db
      .prepare("SELECT id, elo, wins, losses FROM opepen WHERE id = ?")
      .get(opepenId) as { id: number; elo: number; wins: number; losses: number } | undefined;

    const totalVotes = db.prepare("SELECT COUNT(*) as c FROM opepen_votes").get() as { c: number };

    if (!op) {
      return NextResponse.json({ opepen: [], total: 0, totalVotes: totalVotes.c, page: 1, totalPages: 0, eloMin: 1500, eloMax: 1500 });
    }

    return NextResponse.json({
      opepen: [op],
      total: 1,
      totalVotes: totalVotes.c,
      page: 1,
      totalPages: 1,
      eloMin: op.elo,
      eloMax: op.elo,
    });
  }

  const opepen = db
    .prepare(
      `SELECT id, elo, wins, losses
       FROM opepen WHERE wins + losses > 0
       ORDER BY elo DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as {
    id: number;
    elo: number;
    wins: number;
    losses: number;
  }[];

  const total = db
    .prepare("SELECT COUNT(*) as c FROM opepen WHERE wins + losses > 0")
    .get() as { c: number };

  const totalVotes = db
    .prepare("SELECT COUNT(*) as c FROM opepen_votes")
    .get() as { c: number };

  const eloRange = db
    .prepare("SELECT MIN(elo) as min, MAX(elo) as max FROM opepen WHERE wins + losses > 0")
    .get() as { min: number; max: number } | undefined;

  return NextResponse.json({
    opepen,
    total: total.c,
    totalVotes: totalVotes.c,
    page,
    totalPages: Math.ceil(total.c / limit),
    eloMin: eloRange?.min ?? 1500,
    eloMax: eloRange?.max ?? 1500,
  });
}
