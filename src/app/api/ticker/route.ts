import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TickerItem {
  text: string;
  punks?: number[];
}

export async function GET() {
  const db = getDb();
  const items: TickerItem[] = [];

  const totalVotes = (
    db.prepare("SELECT COUNT(*) as c FROM votes").get() as { c: number }
  ).c;

  if (totalVotes === 0) {
    return NextResponse.json({ items: [{ text: "NO VOTES YET — BE THE FIRST" }] });
  }

  // Total votes
  items.push({ text: `${totalVotes.toLocaleString()} VOTES CAST` });

  // Total unique voters
  const totalVoters = (
    db
      .prepare("SELECT COUNT(DISTINCT voter_ip) as c FROM votes WHERE voter_ip IS NOT NULL")
      .get() as { c: number }
  ).c;
  if (totalVoters > 0) {
    items.push({ text: `${totalVoters.toLocaleString()} VOTERS` });
  }

  // Number of punks that have been voted on
  const votedPunks = (
    db
      .prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0")
      .get() as { c: number }
  ).c;
  items.push({ text: `${votedPunks.toLocaleString()} / 10,000 PUNKS RATED` });

  // #1 ranked punk
  const top = db
    .prepare(
      "SELECT id, elo FROM punks WHERE wins + losses > 0 ORDER BY elo DESC LIMIT 1"
    )
    .get() as { id: number; elo: number } | undefined;
  if (top) {
    items.push({
      text: `#${top.id.toString().padStart(4, "0")} IS RANKED #1 — ELO ${Math.round(top.elo)}`,
      punks: [top.id],
    });
  }

  // Last ranked punk
  const bottom = db
    .prepare(
      "SELECT id, elo FROM punks WHERE wins + losses > 0 ORDER BY elo ASC LIMIT 1"
    )
    .get() as { id: number; elo: number } | undefined;
  if (bottom) {
    items.push({
      text: `#${bottom.id.toString().padStart(4, "0")} IS RANKED LAST — ELO ${Math.round(bottom.elo)}`,
      punks: [bottom.id],
    });
  }

  // Most voted punk
  const mostVoted = db
    .prepare(
      "SELECT id, wins + losses as total FROM punks WHERE wins + losses > 0 ORDER BY total DESC LIMIT 1"
    )
    .get() as { id: number; total: number } | undefined;
  if (mostVoted) {
    items.push({
      text: `#${mostVoted.id.toString().padStart(4, "0")} MOST VOTED — ${mostVoted.total} MATCHUPS`,
      punks: [mostVoted.id],
    });
  }

  // Best win rate (min 5 votes)
  const bestWR = db
    .prepare(
      `SELECT id, wins, losses, CAST(wins AS REAL) / (wins + losses) as wr
       FROM punks WHERE wins + losses >= 5 ORDER BY wr DESC LIMIT 1`
    )
    .get() as { id: number; wins: number; losses: number; wr: number } | undefined;
  if (bestWR) {
    items.push({
      text: `#${bestWR.id.toString().padStart(4, "0")} — ${Math.round(bestWR.wr * 100)}% WIN RATE`,
      punks: [bestWR.id],
    });
  }

  // Recent vote
  const recent = db
    .prepare(
      "SELECT winner_id, loser_id FROM votes ORDER BY id DESC LIMIT 1"
    )
    .get() as { winner_id: number; loser_id: number } | undefined;
  if (recent) {
    items.push({
      text: `LATEST: #${recent.winner_id.toString().padStart(4, "0")} BEAT #${recent.loser_id.toString().padStart(4, "0")}`,
      punks: [recent.winner_id, recent.loser_id],
    });
  }

  // Top trait by avg elo
  const topTrait = db
    .prepare(
      `SELECT pt.trait, AVG(p.elo) as avg_elo
       FROM punk_traits pt JOIN punks p ON pt.punk_id = p.id
       WHERE p.wins + p.losses > 0
       GROUP BY pt.trait HAVING COUNT(*) >= 3
       ORDER BY avg_elo DESC LIMIT 1`
    )
    .get() as { trait: string; avg_elo: number } | undefined;
  if (topTrait) {
    items.push({
      text: `TOP TRAIT: ${topTrait.trait.toUpperCase()} — AVG ELO ${Math.round(topTrait.avg_elo)}`,
    });
  }

  // Biggest upset: recent vote where winner elo was much lower than loser elo
  const upset = db
    .prepare(
      `SELECT v.winner_id, v.loser_id,
              pw.elo as winner_elo, pl.elo as loser_elo
       FROM votes v
       JOIN punks pw ON v.winner_id = pw.id
       JOIN punks pl ON v.loser_id = pl.id
       ORDER BY (pl.elo - pw.elo) DESC LIMIT 1`
    )
    .get() as {
    winner_id: number;
    loser_id: number;
    winner_elo: number;
    loser_elo: number;
  } | undefined;
  if (upset && upset.loser_elo - upset.winner_elo > 20) {
    items.push({
      text: `UPSET: #${upset.winner_id.toString().padStart(4, "0")} BEAT #${upset.loser_id.toString().padStart(4, "0")} (+${Math.round(upset.loser_elo - upset.winner_elo)} ELO GAP)`,
      punks: [upset.winner_id, upset.loser_id],
    });
  }

  // Type breakdown: count of each type that has votes
  const types = db
    .prepare(
      `SELECT type, COUNT(*) as c FROM punks
       WHERE type IS NOT NULL AND wins + losses > 0
       GROUP BY type ORDER BY c DESC LIMIT 3`
    )
    .all() as { type: string; c: number }[];
  if (types.length > 0) {
    const parts = types.map((t) => `${t.c} ${t.type.toUpperCase()}S`).join(" · ");
    items.push({ text: `RATED: ${parts}` });
  }

  return NextResponse.json({ items });
}
