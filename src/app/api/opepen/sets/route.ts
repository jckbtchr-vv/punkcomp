import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface SetInfo {
  id: number;
  name: string;
  artist: string;
  description: string;
  edition_type: string;
}

let setsData: SetInfo[] | null = null;

function loadSetsData(): SetInfo[] {
  if (setsData) return setsData;
  try {
    const jsonPath = path.join(process.cwd(), "data", "opepen-sets.json");
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    setsData = parsed.sets;
    return setsData!;
  } catch {
    return [];
  }
}

export async function GET() {
  const db = getDb();
  const setsInfo = loadSetsData();

  // Aggregate stats by set_id for opepen that have votes and set info
  const dbSets = db
    .prepare(
      `SELECT
         set_id,
         set_name,
         artist,
         COUNT(DISTINCT COALESCE(image_group, CAST(id AS TEXT))) as image_count,
         ROUND(AVG(elo), 1) as avg_elo,
         SUM(wins) as total_wins,
         SUM(losses) as total_losses
       FROM opepen
       WHERE set_id IS NOT NULL AND (wins + losses) > 0
       GROUP BY set_id
       ORDER BY avg_elo DESC`
    )
    .all() as {
    set_id: number;
    set_name: string | null;
    artist: string | null;
    image_count: number;
    avg_elo: number;
    total_wins: number;
    total_losses: number;
  }[];

  // Merge with static set data
  const sets = dbSets.map((s) => {
    const info = setsInfo.find((si) => si.id === s.set_id);
    return {
      setId: s.set_id,
      name: s.set_name || info?.name || `Set ${s.set_id}`,
      artist: s.artist || info?.artist || "Unknown",
      imageCount: s.image_count,
      avgElo: s.avg_elo,
      totalWins: s.total_wins,
      totalLosses: s.total_losses,
    };
  });

  return NextResponse.json({ sets });
}
