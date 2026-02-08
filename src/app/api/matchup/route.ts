import { NextResponse } from "next/server";
import { createMatchupToken } from "@/lib/matchup-tokens";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Pick two distinct random punk IDs (0-9999)
  const a = Math.floor(Math.random() * 10000);
  let b = Math.floor(Math.random() * 9999);
  if (b >= a) b++;

  const token = createMatchupToken(a, b);

  const db = getDb();
  const traitsA = (db.prepare("SELECT trait FROM punk_traits WHERE punk_id = ?").all(a) as { trait: string }[]).map(r => r.trait);
  const traitsB = (db.prepare("SELECT trait FROM punk_traits WHERE punk_id = ?").all(b) as { trait: string }[]).map(r => r.trait);

  return NextResponse.json({
    punk1: a, punk2: b, token,
    punk1Traits: traitsA, punk2Traits: traitsB,
  });
}
