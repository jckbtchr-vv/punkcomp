import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createMatchupToken } from "@/lib/matchup-tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  // Try to pick from distinct image groups (avoids showing same print twice)
  const grouped = db
    .prepare(
      `SELECT id, image_group FROM opepen
       WHERE image_group IS NOT NULL
       GROUP BY image_group
       ORDER BY RANDOM() LIMIT 2`
    )
    .all() as { id: number; image_group: string }[];

  let a: number, b: number;

  if (grouped.length === 2 && grouped[0].image_group !== grouped[1].image_group) {
    a = grouped[0].id;
    b = grouped[1].id;
  } else {
    // Fall back to random IDs (pre-population phase)
    a = Math.floor(Math.random() * 16000) + 1;
    b = Math.floor(Math.random() * 15999) + 1;
    if (b >= a) b++;
  }

  const token = createMatchupToken(a, b);

  return NextResponse.json({ opepen1: a, opepen2: b, token });
}
