import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const K = 32;

function calcElo(winnerElo: number, loserElo: number) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  return {
    newWinnerElo: Math.round((winnerElo + K * (1 - expectedWinner)) * 100) / 100,
    newLoserElo: Math.round((loserElo + K * (0 - expectedLoser)) * 100) / 100,
  };
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  // Simple auth - set ADMIN_SECRET env var or use default
  const expected = process.env.ADMIN_SECRET || "pvp-cleanup-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Step 1: Find gamed votes - IPs that voted for same winner punk > 5 times
  const suspicious = db.prepare(`
    SELECT voter_ip, winner_id, COUNT(*) as cnt
    FROM votes
    WHERE voter_ip IS NOT NULL
    GROUP BY voter_ip, winner_id
    HAVING cnt > 5
  `).all() as { voter_ip: string; winner_id: number; cnt: number }[];

  // Step 2: For each suspicious IP+punk combo, keep only the first 3 votes, delete the rest
  let totalRemoved = 0;
  const deleteExcess = db.transaction(() => {
    for (const { voter_ip, winner_id, cnt } of suspicious) {
      // Get all vote IDs for this IP+winner, ordered by time
      const voteIds = db.prepare(`
        SELECT id FROM votes
        WHERE voter_ip = ? AND winner_id = ?
        ORDER BY created_at ASC, id ASC
      `).all(voter_ip, winner_id) as { id: number }[];

      // Keep first 3, delete the rest
      const toDelete = voteIds.slice(3);
      for (const { id } of toDelete) {
        db.prepare("DELETE FROM votes WHERE id = ?").run(id);
        totalRemoved++;
      }
    }
  });
  deleteExcess();

  // Step 3: Also remove votes from IPs with no voter_ip that look suspicious
  // (pre-migration votes) - we can't identify those, so leave them

  // Step 4: Recalculate all Elo from scratch by replaying remaining votes
  const resetAndReplay = db.transaction(() => {
    // Reset all punks to base
    db.prepare("UPDATE punks SET elo = 1500, wins = 0, losses = 0").run();

    // Replay all remaining votes in chronological order
    const allVotes = db.prepare(
      "SELECT winner_id, loser_id FROM votes ORDER BY created_at ASC, id ASC"
    ).all() as { winner_id: number; loser_id: number }[];

    // In-memory Elo map for fast replay
    const elos = new Map<number, number>();

    for (const vote of allVotes) {
      const wElo = elos.get(vote.winner_id) ?? 1500;
      const lElo = elos.get(vote.loser_id) ?? 1500;
      const { newWinnerElo, newLoserElo } = calcElo(wElo, lElo);
      elos.set(vote.winner_id, newWinnerElo);
      elos.set(vote.loser_id, newLoserElo);
    }

    // Write back to DB
    const updatePunk = db.prepare(
      "UPDATE punks SET elo = ?, wins = (SELECT COUNT(*) FROM votes WHERE winner_id = punks.id), losses = (SELECT COUNT(*) FROM votes WHERE loser_id = punks.id) WHERE id = ?"
    );

    for (const [punkId, elo] of elos) {
      updatePunk.run(elo, punkId);
    }

    return allVotes.length;
  });

  const remainingVotes = resetAndReplay();

  return NextResponse.json({
    suspiciousPatterns: suspicious.length,
    votesRemoved: totalRemoved,
    remainingVotes,
    message: "Cleanup complete. Elo recalculated from clean votes.",
  });
}
