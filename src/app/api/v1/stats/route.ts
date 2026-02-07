import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  const db = getDb();

  const totalVotes = (db.prepare("SELECT COUNT(*) as c FROM votes").get() as { c: number }).c;
  const totalVoters = (db.prepare("SELECT COUNT(DISTINCT voter_ip) as c FROM votes WHERE voter_ip IS NOT NULL").get() as { c: number }).c;
  const punksRated = (db.prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0").get() as { c: number }).c;

  const eloRange = db
    .prepare("SELECT MIN(elo) as min, MAX(elo) as max, AVG(elo) as avg FROM punks WHERE wins + losses > 0")
    .get() as { min: number; max: number; avg: number } | undefined;

  const topPunk = db
    .prepare("SELECT id, elo FROM punks WHERE wins + losses > 0 ORDER BY elo DESC LIMIT 1")
    .get() as { id: number; elo: number } | undefined;

  const bottomPunk = db
    .prepare("SELECT id, elo FROM punks WHERE wins + losses > 0 ORDER BY elo ASC LIMIT 1")
    .get() as { id: number; elo: number } | undefined;

  const mostVoted = db
    .prepare("SELECT id, wins + losses as total FROM punks ORDER BY total DESC LIMIT 1")
    .get() as { id: number; total: number } | undefined;

  return NextResponse.json(
    {
      data: {
        totalVotes,
        totalVoters,
        totalPunks: 10000,
        punksRated,
        elo: {
          min: eloRange ? Math.round(eloRange.min * 100) / 100 : null,
          max: eloRange ? Math.round(eloRange.max * 100) / 100 : null,
          avg: eloRange ? Math.round(eloRange.avg * 100) / 100 : null,
        },
        topPunk: topPunk ? { id: topPunk.id, elo: Math.round(topPunk.elo * 100) / 100 } : null,
        bottomPunk: bottomPunk ? { id: bottomPunk.id, elo: Math.round(bottomPunk.elo * 100) / 100 } : null,
        mostVotedPunk: mostVoted ? { id: mostVoted.id, totalMatchups: mostVoted.total } : null,
      },
    },
    { headers: CORS }
  );
}
