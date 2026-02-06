import { NextResponse } from "next/server";
import { syncPrices, getLastSyncTime, hasPriceData } from "@/lib/prices";

export const dynamic = "force-dynamic";

// GET: check sync status
export async function GET() {
  return NextResponse.json({
    hasPriceData: hasPriceData(),
    lastSync: getLastSyncTime(),
    alchemyKeyConfigured: !!process.env.ALCHEMY_API_KEY,
  });
}

// POST: trigger a sync
export async function POST() {
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
