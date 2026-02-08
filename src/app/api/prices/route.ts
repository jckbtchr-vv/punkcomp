import { NextRequest, NextResponse } from "next/server";
import { syncPrices, getLastSyncTime, hasPriceData } from "@/lib/prices";

export const dynamic = "force-dynamic";

// GET: check sync status
export async function GET() {
  return NextResponse.json({
    hasPriceData: hasPriceData(),
    lastSync: getLastSyncTime(),
  });
}

// POST: trigger a sync (requires ADMIN_SECRET)
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const expected = process.env.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ALCHEMY_API_KEY) {
    return NextResponse.json(
      { error: "ALCHEMY_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await syncPrices();
    return NextResponse.json({
      success: true,
      synced: result.synced,
      pages: result.pages,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
