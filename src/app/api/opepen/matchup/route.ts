import { NextResponse } from "next/server";
import { createMatchupToken } from "@/lib/matchup-tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  // Pick two distinct random opepen IDs (1-16000)
  const a = Math.floor(Math.random() * 16000) + 1;
  let b = Math.floor(Math.random() * 15999) + 1;
  if (b >= a) b++;

  const token = createMatchupToken(a, b);

  return NextResponse.json({ opepen1: a, opepen2: b, token });
}
