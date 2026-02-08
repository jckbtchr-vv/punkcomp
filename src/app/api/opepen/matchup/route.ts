import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createMatchupToken } from "@/lib/matchup-tokens";

export const dynamic = "force-dynamic";

const MIN_GROUPS_FOR_DEDUP = 100;

export async function GET() {
  const db = getDb();

  let a: number, b: number;

  // Only use image-group dedup once we have enough groups populated
  const groupCount = (
    db.prepare("SELECT COUNT(DISTINCT image_group) as c FROM opepen WHERE image_group IS NOT NULL").get() as { c: number }
  ).c;

  if (groupCount >= MIN_GROUPS_FOR_DEDUP) {
    const grouped = db
      .prepare(
        `SELECT id, image_group FROM opepen
         WHERE image_group IS NOT NULL
         GROUP BY image_group
         ORDER BY RANDOM() LIMIT 2`
      )
      .all() as { id: number; image_group: string }[];

    if (grouped.length === 2 && grouped[0].image_group !== grouped[1].image_group) {
      a = grouped[0].id;
      b = grouped[1].id;
    } else {
      a = Math.floor(Math.random() * 16000) + 1;
      b = Math.floor(Math.random() * 15999) + 1;
      if (b >= a) b++;
    }
  } else {
    // Random IDs until enough image groups are populated
    a = Math.floor(Math.random() * 16000) + 1;
    b = Math.floor(Math.random() * 15999) + 1;
    if (b >= a) b++;
  }

  const token = createMatchupToken(a, b);

  return NextResponse.json({ opepen1: a, opepen2: b, token });
}
