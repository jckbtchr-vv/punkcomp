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
    .prepare("SELECT id, elo, wins, losses, image_group FROM opepen WHERE id = ?")
    .get(id) as { id: number; elo: number; wins: number; losses: number; image_group: string | null } | undefined;

  if (!op) {
    return NextResponse.json({ error: "Opepen not found" }, { status: 404 });
  }

  // Aggregate stats across image group (prints share stats)
  let totalWins = op.wins, totalLosses = op.losses, editionSize = 1;
  let siblingIds: number[] = [];
  if (op.image_group) {
    const agg = db.prepare(
      "SELECT SUM(wins) as w, SUM(losses) as l, COUNT(*) as c FROM opepen WHERE image_group = ?"
    ).get(op.image_group) as { w: number; l: number; c: number };
    totalWins = agg.w;
    totalLosses = agg.l;
    editionSize = agg.c;
    if (editionSize > 1) {
      siblingIds = (db.prepare(
        "SELECT id FROM opepen WHERE image_group = ? AND id != ? ORDER BY id LIMIT 10"
      ).all(op.image_group, id) as { id: number }[]).map(r => r.id);
    }
  }

  // Compute rank (deduplicated by image group)
  const rank =
    totalWins + totalLosses > 0
      ? (
          db
            .prepare(
              `SELECT COUNT(*) as c FROM (
                SELECT elo FROM opepen
                GROUP BY COALESCE(image_group, CAST(id AS TEXT))
                HAVING SUM(wins) + SUM(losses) > 0 AND elo > ?
              )`
            )
            .get(op.elo) as { c: number }
        ).c + 1
      : null;

  const totalRanked = (
    db.prepare(
      `SELECT COUNT(*) as c FROM (
        SELECT 1 FROM opepen
        GROUP BY COALESCE(image_group, CAST(id AS TEXT))
        HAVING SUM(wins) + SUM(losses) > 0
      )`
    ).get() as { c: number }
  ).c;

  // Get vote history (across all tokens in the image group for prints)
  let votes;
  if (op.image_group && editionSize > 1) {
    votes = db
      .prepare(
        `SELECT id, winner_id, loser_id, created_at FROM opepen_votes
         WHERE winner_id IN (SELECT id FROM opepen WHERE image_group = ?)
            OR loser_id IN (SELECT id FROM opepen WHERE image_group = ?)
         ORDER BY id DESC
         LIMIT 100`
      )
      .all(op.image_group, op.image_group) as {
      id: number;
      winner_id: number;
      loser_id: number;
      created_at: string;
    }[];
  } else {
    votes = db
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
  }

  // For prints, determine won/lost based on whether any sibling was the winner
  const groupIds = op.image_group && editionSize > 1
    ? new Set((db.prepare("SELECT id FROM opepen WHERE image_group = ?").all(op.image_group) as { id: number }[]).map(r => r.id))
    : new Set([id]);

  const history = votes.map((v) => ({
    id: v.id,
    won: groupIds.has(v.winner_id),
    opponentId: groupIds.has(v.winner_id) ? v.loser_id : v.winner_id,
    createdAt: v.created_at,
  }));

  return NextResponse.json({
    opepen: {
      id: op.id,
      rank,
      totalRanked,
      elo: Math.round(op.elo * 100) / 100,
      wins: totalWins,
      losses: totalLosses,
      winRate:
        totalWins + totalLosses > 0
          ? Math.round((totalWins / (totalWins + totalLosses)) * 10000) / 100
          : 0,
      editionSize,
      siblingIds,
    },
    history,
  });
}
