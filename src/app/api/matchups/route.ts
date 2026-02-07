import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TraitMatchup {
  traitA: string;
  traitB: string;
  aWins: number;
  bWins: number;
  total: number;
  aPct: number;
}

export async function GET() {
  const db = getDb();

  // Get traits that appear in voted punks
  const activeTraits = db
    .prepare(
      `SELECT DISTINCT pt.trait, COUNT(DISTINCT pt.punk_id) as cnt
       FROM punk_traits pt
       JOIN punks p ON pt.punk_id = p.id
       WHERE p.wins + p.losses > 0
       GROUP BY pt.trait
       HAVING cnt >= 3
       ORDER BY cnt DESC
       LIMIT 40`
    )
    .all() as { trait: string; cnt: number }[];

  if (activeTraits.length < 2) {
    return NextResponse.json({ matchups: [] });
  }

  // Generate random unique pairs
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  const maxPairs = Math.min(20, (activeTraits.length * (activeTraits.length - 1)) / 2);

  while (pairs.length < maxPairs) {
    const a = activeTraits[Math.floor(Math.random() * activeTraits.length)].trait;
    const b = activeTraits[Math.floor(Math.random() * activeTraits.length)].trait;
    if (a === b) continue;
    const key = [a, b].sort().join("|||");
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([a, b]);
  }

  // For each pair, count head-to-head from actual votes
  const stmtAB = db.prepare(
    `SELECT COUNT(*) as c FROM votes v
     JOIN punk_traits wt ON v.winner_id = wt.punk_id
     JOIN punk_traits lt ON v.loser_id = lt.punk_id
     WHERE wt.trait = ? AND lt.trait = ?`
  );

  const matchups: TraitMatchup[] = [];

  for (const [a, b] of pairs) {
    const aWins = (stmtAB.get(a, b) as { c: number }).c;
    const bWins = (stmtAB.get(b, a) as { c: number }).c;
    const total = aWins + bWins;
    if (total === 0) continue;

    const aPct = Math.round((aWins / total) * 100);

    // Always put the winner on the left
    if (aPct >= 50) {
      matchups.push({ traitA: a, traitB: b, aWins, bWins, total, aPct });
    } else {
      matchups.push({
        traitA: b,
        traitB: a,
        aWins: bWins,
        bWins: aWins,
        total,
        aPct: 100 - aPct,
      });
    }
  }

  // Sort by most lopsided first
  matchups.sort((a, b) => Math.abs(b.aPct - 50) - Math.abs(a.aPct - 50));

  return NextResponse.json({ matchups });
}
