import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateElo } from "@/lib/elo";

export async function POST(req: NextRequest) {
  const { winnerId, loserId } = await req.json();

  if (
    typeof winnerId !== "number" ||
    typeof loserId !== "number" ||
    winnerId < 0 ||
    winnerId > 9999 ||
    loserId < 0 ||
    loserId > 9999 ||
    winnerId === loserId
  ) {
    return NextResponse.json({ error: "Invalid punk IDs" }, { status: 400 });
  }

  const db = getDb();

  const winner = db.prepare("SELECT elo FROM punks WHERE id = ?").get(winnerId) as { elo: number };
  const loser = db.prepare("SELECT elo FROM punks WHERE id = ?").get(loserId) as { elo: number };

  const { newWinnerElo, newLoserElo } = calculateElo(winner.elo, loser.elo);

  const update = db.transaction(() => {
    db.prepare("UPDATE punks SET elo = ?, wins = wins + 1 WHERE id = ?").run(
      newWinnerElo,
      winnerId
    );
    db.prepare(
      "UPDATE punks SET elo = ?, losses = losses + 1 WHERE id = ?"
    ).run(newLoserElo, loserId);
    db.prepare("INSERT INTO votes (winner_id, loser_id) VALUES (?, ?)").run(
      winnerId,
      loserId
    );
  });

  update();

  return NextResponse.json({ success: true });
}
