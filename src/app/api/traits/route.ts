import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  // Aggregate: for each trait, compute avg elo, total wins, total losses
  // among punks that have at least 1 vote
  const traits = db
    .prepare(
      `SELECT
         pt.trait,
         COUNT(*) as punk_count,
         ROUND(AVG(p.elo), 1) as avg_elo,
         SUM(p.wins) as total_wins,
         SUM(p.losses) as total_losses
       FROM punk_traits pt
       JOIN punks p ON p.id = pt.punk_id
       WHERE p.wins + p.losses > 0
       GROUP BY pt.trait
       ORDER BY avg_elo DESC`
    )
    .all() as {
    trait: string;
    punk_count: number;
    avg_elo: number;
    total_wins: number;
    total_losses: number;
  }[];

  return NextResponse.json({ traits });
}
