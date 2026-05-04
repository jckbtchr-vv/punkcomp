import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TickerItem {
  text: string;
  opepen?: number[];
}

export async function GET() {
  const db = getDb();
  const items: TickerItem[] = [];

  const totalVotes = (
    db.prepare("SELECT COUNT(*) as c FROM opepen_votes").get() as { c: number }
  ).c;

  if (totalVotes === 0) {
    return NextResponse.json({ items: [{ text: "NO VOTES YET — BE THE FIRST" }] });
  }

  // Total votes
  items.push({ text: `${totalVotes.toLocaleString()} OPEPEN VOTES` });

  // Total unique voters
  const totalVoters = (
    db
      .prepare("SELECT COUNT(DISTINCT voter_ip) as c FROM opepen_votes WHERE voter_ip IS NOT NULL")
      .get() as { c: number }
  ).c;
  if (totalVoters >= 100) {
    items.push({ text: `${totalVoters.toLocaleString()} VOTERS` });
  }

  // Number of unique images that have been voted on
  const votedImages = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM (
          SELECT 1 FROM opepen
          GROUP BY COALESCE(image_group, CAST(id AS TEXT))
          HAVING SUM(wins) + SUM(losses) > 0
        )`
      )
      .get() as { c: number }
  ).c;
  items.push({ text: `${votedImages.toLocaleString()} UNIQUE IMAGES RATED` });

  // #1 ranked opepen
  const top = db
    .prepare(
      `SELECT MIN(id) as id, elo, set_name FROM opepen
       WHERE wins + losses > 0
       GROUP BY COALESCE(image_group, CAST(id AS TEXT))
       ORDER BY elo DESC LIMIT 1`
    )
    .get() as { id: number; elo: number; set_name: string | null } | undefined;
  if (top) {
    const setLabel = top.set_name ? ` (${top.set_name})` : "";
    items.push({
      text: `#${top.id} IS RANKED #1${setLabel} — ELO ${Math.round(top.elo)}`,
      opepen: [top.id],
    });
  }

  // Last ranked opepen
  const bottom = db
    .prepare(
      `SELECT MIN(id) as id, elo, set_name FROM opepen
       WHERE wins + losses > 0
       GROUP BY COALESCE(image_group, CAST(id AS TEXT))
       ORDER BY elo ASC LIMIT 1`
    )
    .get() as { id: number; elo: number; set_name: string | null } | undefined;
  if (bottom) {
    items.push({
      text: `#${bottom.id} IS RANKED LAST — ELO ${Math.round(bottom.elo)}`,
      opepen: [bottom.id],
    });
  }

  // Most voted opepen (by image group)
  const mostVoted = db
    .prepare(
      `SELECT MIN(id) as id, SUM(wins) + SUM(losses) as total FROM opepen
       WHERE wins + losses > 0
       GROUP BY COALESCE(image_group, CAST(id AS TEXT))
       ORDER BY total DESC LIMIT 1`
    )
    .get() as { id: number; total: number } | undefined;
  if (mostVoted) {
    items.push({
      text: `#${mostVoted.id} MOST VOTED — ${mostVoted.total} MATCHUPS`,
      opepen: [mostVoted.id],
    });
  }

  // Best win rate (min 5 votes)
  const bestWR = db
    .prepare(
      `SELECT MIN(id) as id, SUM(wins) as wins, SUM(losses) as losses,
              CAST(SUM(wins) AS REAL) / (SUM(wins) + SUM(losses)) as wr
       FROM opepen
       GROUP BY COALESCE(image_group, CAST(id AS TEXT))
       HAVING SUM(wins) + SUM(losses) >= 5
       ORDER BY wr DESC LIMIT 1`
    )
    .get() as { id: number; wins: number; losses: number; wr: number } | undefined;
  if (bestWR) {
    items.push({
      text: `#${bestWR.id} — ${Math.round(bestWR.wr * 100)}% WIN RATE`,
      opepen: [bestWR.id],
    });
  }

  // Recent vote
  const recent = db
    .prepare(
      "SELECT winner_id, loser_id FROM opepen_votes ORDER BY id DESC LIMIT 1"
    )
    .get() as { winner_id: number; loser_id: number } | undefined;
  if (recent) {
    items.push({
      text: `LATEST: #${recent.winner_id} BEAT #${recent.loser_id}`,
      opepen: [recent.winner_id, recent.loser_id],
    });
  }

  // Top set by avg elo (if we have set data)
  const topSet = db
    .prepare(
      `SELECT set_name, AVG(elo) as avg_elo
       FROM opepen
       WHERE set_id IS NOT NULL AND wins + losses > 0
       GROUP BY set_id
       HAVING COUNT(*) >= 3
       ORDER BY avg_elo DESC LIMIT 1`
    )
    .get() as { set_name: string; avg_elo: number } | undefined;
  if (topSet) {
    items.push({
      text: `TOP SET: ${topSet.set_name.toUpperCase()} — AVG ELO ${Math.round(topSet.avg_elo)}`,
    });
  }

  // Top artist by avg elo
  const topArtist = db
    .prepare(
      `SELECT artist, AVG(elo) as avg_elo
       FROM opepen
       WHERE artist IS NOT NULL AND wins + losses > 0
       GROUP BY artist
       HAVING COUNT(*) >= 3
       ORDER BY avg_elo DESC LIMIT 1`
    )
    .get() as { artist: string; avg_elo: number } | undefined;
  if (topArtist) {
    items.push({
      text: `TOP ARTIST: ${topArtist.artist.toUpperCase()} — AVG ELO ${Math.round(topArtist.avg_elo)}`,
    });
  }

  // Biggest upset
  const upset = db
    .prepare(
      `SELECT v.winner_id, v.loser_id,
              ow.elo as winner_elo, ol.elo as loser_elo
       FROM opepen_votes v
       JOIN opepen ow ON v.winner_id = ow.id
       JOIN opepen ol ON v.loser_id = ol.id
       ORDER BY (ol.elo - ow.elo) DESC LIMIT 1`
    )
    .get() as {
    winner_id: number;
    loser_id: number;
    winner_elo: number;
    loser_elo: number;
  } | undefined;
  if (upset && upset.loser_elo - upset.winner_elo > 20) {
    items.push({
      text: `UPSET: #${upset.winner_id} BEAT #${upset.loser_id} (+${Math.round(upset.loser_elo - upset.winner_elo)} ELO GAP)`,
      opepen: [upset.winner_id, upset.loser_id],
    });
  }

  return NextResponse.json({ items });
}
