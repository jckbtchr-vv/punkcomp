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
  const row = db.prepare("SELECT COUNT(*) as c FROM votes").get() as { c: number };

  return NextResponse.json({ online: getOnlineCount(), totalVotes: row.c });
}
