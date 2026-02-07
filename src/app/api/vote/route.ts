import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateElo } from "@/lib/elo";
import { checkRateLimit, checkPunkLimit, checkPairLimit } from "@/lib/ratelimit";
import { validateMatchupToken } from "@/lib/matchup-tokens";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many votes. Try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" },
      }
    );
  }

  let winnerId: number, loserId: number, token: string;
  try {
    const body = await req.json();
    winnerId = body.winnerId;
    loserId = body.loserId;
    token = body.token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    typeof winnerId !== "number" ||
    typeof loserId !== "number" ||
    winnerId < 0 ||
    winnerId > 9999 ||
    loserId < 0 ||
    loserId > 9999 ||
    winnerId === loserId
  ) {
    return NextResponse.json({ error: "Invalid punk IDs" }, { status: 400 });
  }

  // Validate server-issued matchup token (prevents arbitrary vote submissions)
  if (!token || !validateMatchupToken(token, winnerId, loserId)) {
    return NextResponse.json({ error: "Invalid or expired matchup." }, { status: 403 });
  }

  // Prevent same pair being voted on repeatedly by same IP
  if (!checkPairLimit(ip, winnerId, loserId)) {
    return NextResponse.json(
      { error: "Already voted on this matchup recently." },
      { status: 429 }
    );
  }

  // Prevent boosting a single punk (max 3 votes involving same punk per hour per IP)
  if (!checkPunkLimit(ip, winnerId) || !checkPunkLimit(ip, loserId)) {
    return NextResponse.json(
      { error: "Too many votes involving the same punk." },
      { status: 429 }
    );
  }

  const db = getDb();

  const winner = db.prepare("SELECT elo FROM punks WHERE id = ?").get(winnerId) as { elo: number };
  const loser = db.prepare("SELECT elo FROM punks WHERE id = ?").get(loserId) as { elo: number };

  const { newWinnerElo, newLoserElo } = calculateElo(winner.elo, loser.elo);

  const update = db.transaction(() => {
    db.prepare("UPDATE punks SET elo = ?, wins = wins + 1 WHERE id = ?").run(
      newWinnerElo,
      winnerId
    );
    db.prepare(
      "UPDATE punks SET elo = ?, losses = losses + 1 WHERE id = ?"
    ).run(newLoserElo, loserId);
    db.prepare("INSERT INTO votes (winner_id, loser_id, voter_ip) VALUES (?, ?, ?)").run(
      winnerId,
      loserId,
      ip
    );
  });

  update();

  return NextResponse.json(
    { success: true },
    { headers: { "X-RateLimit-Remaining": String(remaining) } }
  );
}
