import { NextResponse } from "next/server";
import { createMatchupToken } from "@/lib/matchup-tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  // Pick two distinct random punk IDs (0-9999)
  const a = Math.floor(Math.random() * 10000);
  let b = Math.floor(Math.random() * 9999);
  if (b >= a) b++;

  const token = createMatchupToken(a, b);

  return NextResponse.json({ punk1: a, punk2: b, token });
}
