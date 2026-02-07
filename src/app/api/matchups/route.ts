import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES = new Set(["Human", "Zombie", "Ape", "Alien"]);

interface TraitMatchup {
  traitA: string;
  traitB: string;
  aWins: number;
  bWins: number;
  total: number;
  aPct: number;
}

function buildMatchups(
  traits: { trait: string }[],
  db: ReturnType<typeof getDb>,
  maxPairs: number
): TraitMatchup[] {
  if (traits.length < 2) return [];

  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  const limit = Math.min(maxPairs, (traits.length * (traits.length - 1)) / 2);
  let attempts = 0;

  while (pairs.length < limit && attempts < limit * 10) {
    attempts++;
    const a = traits[Math.floor(Math.random() * traits.length)].trait;
    const b = traits[Math.floor(Math.random() * traits.length)].trait;
    if (a === b) continue;
    const key = [a, b].sort().join("|||");
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([a, b]);
  }

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

  matchups.sort((a, b) => Math.abs(b.aPct - 50) - Math.abs(a.aPct - 50));
  return matchups;
}

export async function GET() {
  const db = getDb();

  const allTraits = db
    .prepare(
      `SELECT DISTINCT pt.trait, COUNT(DISTINCT pt.punk_id) as cnt
       FROM punk_traits pt
       JOIN punks p ON pt.punk_id = p.id
       WHERE p.wins + p.losses > 0
       GROUP BY pt.trait
       HAVING cnt >= 3
       ORDER BY cnt DESC
       LIMIT 50`
    )
    .all() as { trait: string; cnt: number }[];

  const typeTraits = allTraits.filter((t) => TYPES.has(t.trait));
  const accessoryTraits = allTraits.filter((t) => !TYPES.has(t.trait));

  const typeMatchups = buildMatchups(typeTraits, db, 6);
  const accessoryMatchups = buildMatchups(accessoryTraits, db, 20);

  return NextResponse.json({ typeMatchups, accessoryMatchups });
}
