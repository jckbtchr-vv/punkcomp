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

  const traits = db
    .prepare(
      `SELECT
        pt.trait,
        COUNT(DISTINCT pt.punk_id) as punkCount,
        ROUND(AVG(p.elo), 2) as avgElo,
        SUM(p.wins) as totalWins,
        SUM(p.losses) as totalLosses
       FROM punk_traits pt
       JOIN punks p ON pt.punk_id = p.id
       WHERE p.wins + p.losses > 0
       GROUP BY pt.trait
       HAVING punkCount >= 2
       ORDER BY avgElo DESC`
    )
    .all() as {
    trait: string;
    punkCount: number;
    avgElo: number;
    totalWins: number;
    totalLosses: number;
  }[];

  return NextResponse.json(
    {
      data: traits.map((t, i) => ({
        rank: i + 1,
        trait: t.trait,
        punkCount: t.punkCount,
        avgElo: t.avgElo,
        totalWins: t.totalWins,
        totalLosses: t.totalLosses,
        winRate: t.totalWins + t.totalLosses > 0
          ? Math.round((t.totalWins / (t.totalWins + t.totalLosses)) * 10000) / 100
          : 0,
      })),
      total: traits.length,
    },
    { headers: CORS }
  );
}
