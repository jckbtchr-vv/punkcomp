import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id) || id < 1 || id > 16000) {
    return NextResponse.json({ error: "Invalid opepen ID" }, { status: 400 });
  }

  const db = getDb();

  const op = db
    .prepare("SELECT id, elo, wins, losses FROM opepen WHERE id = ?")
    .get(id) as { id: number; elo: number; wins: number; losses: number } | undefined;

  if (!op) {
    return NextResponse.json({ error: "Opepen not found" }, { status: 404 });
  }

  // Compute rank
  const rank =
    op.wins + op.losses > 0
      ? (
          db
            .prepare("SELECT COUNT(*) as c FROM opepen WHERE wins + losses > 0 AND elo > ?")
            .get(op.elo) as { c: number }
        ).c + 1
      : null;

  const totalRanked = (
    db.prepare("SELECT COUNT(*) as c FROM opepen WHERE wins + losses > 0").get() as { c: number }
  ).c;

  // Get vote history
  const votes = db
    .prepare(
      `SELECT id, winner_id, loser_id, created_at FROM opepen_votes
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

  return NextResponse.json({
    opepen: {
      id: op.id,
      rank,
      totalRanked,
      elo: Math.round(op.elo * 100) / 100,
      wins: op.wins,
      losses: op.losses,
      winRate:
        op.wins + op.losses > 0
          ? Math.round((op.wins / (op.wins + op.losses)) * 10000) / 100
          : 0,
    },
    history,
  });
}
