import { NextRequest, NextResponse } from "next/server";
import { heartbeat, getOnlineCount } from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  heartbeat(ip);

  return NextResponse.json({ online: getOnlineCount() });
}
