import { NextResponse } from "next/server";
import { getCollectorsWithElo, syncCollectors, collectorsNeedRefresh } from "@/lib/market";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Check if we need to refresh collector data
  if (collectorsNeedRefresh()) {
    try {
      await syncCollectors();
    } catch (error) {
      console.error("Failed to sync collectors:", error);
    }
  }

  const db = getDb();

  // Get total vote stats
  const totalVotes = (
    db.prepare("SELECT COUNT(*) as c FROM votes").get() as { c: number }
  ).c;

  const totalVoters = (
    db
      .prepare("SELECT COUNT(DISTINCT voter_ip) as c FROM votes WHERE voter_ip IS NOT NULL")
      .get() as { c: number }
  ).c;

  // Get collectors with ELO aggregation
  const collectors = getCollectorsWithElo();

  // Filter to only show collectors with at least 1 ranked punk
  const rankedCollectors = collectors.filter((c) => c.rankedPunkCount > 0);

  // Sort by avg ELO descending
  rankedCollectors.sort((a, b) => b.avgElo - a.avgElo);

  // Compute ELO range for bars
  const eloMin = rankedCollectors.length > 0 ? Math.min(...rankedCollectors.map((c) => c.avgElo)) : 1500;
  const eloMax = rankedCollectors.length > 0 ? Math.max(...rankedCollectors.map((c) => c.avgElo)) : 1500;

  return NextResponse.json({
    collectors: rankedCollectors,
    total: rankedCollectors.length,
    totalVotes,
    totalVoters,
    eloMin,
    eloMax,
  });
}
