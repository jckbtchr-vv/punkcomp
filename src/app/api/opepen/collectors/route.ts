import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  // Get total vote stats
  const totalVotes = (
    db.prepare("SELECT COUNT(*) as c FROM opepen_votes").get() as { c: number }
  ).c;

  // Aggregate collectors from synced opepen data
  // Only include owners with at least 1 opepen that has been voted on
  const collectors = db.prepare(`
    SELECT
      o.owner,
      e.ens_name,
      COUNT(*) as opepen_count,
      COUNT(CASE WHEN o.wins + o.losses > 0 THEN 1 END) as rated_count,
      ROUND(AVG(CASE WHEN o.wins + o.losses > 0 THEN o.elo END), 1) as avg_elo,
      SUM(CASE WHEN o.wins + o.losses > 0 THEN o.elo ELSE 0 END) as total_elo,
      SUM(o.wins) as total_wins,
      SUM(o.losses) as total_losses
    FROM opepen o
    LEFT JOIN opepen_ens e ON LOWER(o.owner) = LOWER(e.address)
    WHERE o.owner IS NOT NULL AND o.owner != ''
    GROUP BY o.owner
    HAVING rated_count > 0
    ORDER BY avg_elo DESC
    LIMIT 100
  `).all() as {
    owner: string;
    ens_name: string | null;
    opepen_count: number;
    rated_count: number;
    avg_elo: number | null;
    total_elo: number;
    total_wins: number;
    total_losses: number;
  }[];

  // Format response
  const formattedCollectors = collectors.map((c) => ({
    address: c.owner,
    ensName: c.ens_name || null,
    opepenCount: c.opepen_count,
    ratedCount: c.rated_count,
    avgElo: c.avg_elo || 1500,
    totalElo: Math.round(c.total_elo),
    totalWins: c.total_wins,
    totalLosses: c.total_losses,
  }));

  // Compute ELO range for bars
  const eloMin = formattedCollectors.length > 0
    ? Math.min(...formattedCollectors.map((c) => c.avgElo))
    : 1500;
  const eloMax = formattedCollectors.length > 0
    ? Math.max(...formattedCollectors.map((c) => c.avgElo))
    : 1500;

  // Count total unique owners
  const totalCollectors = (
    db.prepare("SELECT COUNT(DISTINCT owner) as c FROM opepen WHERE owner IS NOT NULL AND owner != ''").get() as { c: number }
  ).c;

  return NextResponse.json({
    collectors: formattedCollectors,
    total: formattedCollectors.length,
    totalCollectors,
    totalVotes,
    eloMin,
    eloMax,
  });
}
