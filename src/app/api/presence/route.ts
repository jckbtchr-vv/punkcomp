import { NextRequest, NextResponse } from "next/server";
import { heartbeat, getOnlineCount } from "@/lib/presence";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  heartbeat(ip);

  const db = getDb();
  const lastVote = db.prepare(
    "SELECT created_at FROM votes ORDER BY id DESC LIMIT 1"
  ).get() as { created_at: string } | undefined;

  return NextResponse.json({ online: getOnlineCount(), lastVoteAt: lastVote?.created_at ?? null });
}
