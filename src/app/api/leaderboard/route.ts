import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const db = getDb();

  const punks = db
    .prepare(
      "SELECT id, elo, wins, losses FROM punks WHERE wins + losses > 0 ORDER BY elo DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset) as { id: number; elo: number; wins: number; losses: number }[];

  const total = db
    .prepare("SELECT COUNT(*) as c FROM punks WHERE wins + losses > 0")
    .get() as { c: number };

  const totalVotes = db
    .prepare("SELECT COUNT(*) as c FROM votes")
    .get() as { c: number };

  return NextResponse.json({
    punks,
    total: total.c,
    totalVotes: totalVotes.c,
    page,
    totalPages: Math.ceil(total.c / limit),
  });
}
