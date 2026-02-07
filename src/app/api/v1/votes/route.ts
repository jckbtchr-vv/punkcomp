import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));

  const db = getDb();

  const votes = db
    .prepare(
      "SELECT id, winner_id, loser_id, created_at FROM votes ORDER BY id DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset) as {
    id: number;
    winner_id: number;
    loser_id: number;
    created_at: string;
  }[];

  const total = (
    db.prepare("SELECT COUNT(*) as c FROM votes").get() as { c: number }
  ).c;

  return NextResponse.json(
    {
      data: votes.map((v) => ({
        id: v.id,
        winnerId: v.winner_id,
        loserId: v.loser_id,
        createdAt: v.created_at,
      })),
      pagination: {
        offset,
        limit,
        total,
      },
    },
    { headers: CORS }
  );
}
