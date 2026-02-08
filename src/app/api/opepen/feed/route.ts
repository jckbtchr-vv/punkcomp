import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const after = parseInt(url.searchParams.get("after") || "0");

  const db = getDb();

  const query = after > 0
    ? db.prepare(
        `SELECT v.id, v.winner_id, v.loser_id, v.created_at,
                pw.elo as winner_elo, pl.elo as loser_elo
         FROM opepen_votes v
         JOIN opepen pw ON v.winner_id = pw.id
         JOIN opepen pl ON v.loser_id = pl.id
         WHERE v.id > ?
         ORDER BY v.id DESC LIMIT 50`
      )
    : db.prepare(
        `SELECT v.id, v.winner_id, v.loser_id, v.created_at,
                pw.elo as winner_elo, pl.elo as loser_elo
         FROM opepen_votes v
         JOIN opepen pw ON v.winner_id = pw.id
         JOIN opepen pl ON v.loser_id = pl.id
         ORDER BY v.id DESC LIMIT 50`
      );

  const votes = (after > 0 ? query.all(after) : query.all()) as {
    id: number;
    winner_id: number;
    loser_id: number;
    created_at: string;
    winner_elo: number;
    loser_elo: number;
  }[];

  return NextResponse.json({
    votes: votes.map((v) => ({
      id: v.id,
      winnerId: v.winner_id,
      loserId: v.loser_id,
      createdAt: v.created_at,
      winnerElo: Math.round(v.winner_elo),
      loserElo: Math.round(v.loser_elo),
    })),
  });
}
