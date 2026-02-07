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

function buildFocusedMatchups(
  focusTrait: string,
  opponents: { trait: string }[],
  db: ReturnType<typeof getDb>
): TraitMatchup[] {
  const stmtAB = db.prepare(
    `SELECT COUNT(*) as c FROM votes v
     JOIN punk_traits wt ON v.winner_id = wt.punk_id
     JOIN punk_traits lt ON v.loser_id = lt.punk_id
     WHERE wt.trait = ? AND lt.trait = ?`
  );

  const matchups: TraitMatchup[] = [];

  for (const { trait: b } of opponents) {
    if (b === focusTrait) continue;
    const aWins = (stmtAB.get(focusTrait, b) as { c: number }).c;
    const bWins = (stmtAB.get(b, focusTrait) as { c: number }).c;
    const total = aWins + bWins;
    if (total === 0) continue;

    const aPct = Math.round((aWins / total) * 100);
    matchups.push({
      traitA: focusTrait,
      traitB: b,
      aWins,
      bWins,
      total,
      aPct,
    });
  }

  matchups.sort((a, b) => b.aPct - a.aPct);
  return matchups;
}

function buildTraitCountMatchups(
  labels: { trait: string }[],
  db: ReturnType<typeof getDb>,
  maxPairs: number
): TraitMatchup[] {
  if (labels.length < 2) return [];

  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  const limit = Math.min(maxPairs, (labels.length * (labels.length - 1)) / 2);
  let attempts = 0;

  while (pairs.length < limit && attempts < limit * 10) {
    attempts++;
    const a = labels[Math.floor(Math.random() * labels.length)].trait;
    const b = labels[Math.floor(Math.random() * labels.length)].trait;
    if (a === b) continue;
    const key = [a, b].sort().join("|||");
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([a, b]);
  }

  const stmt = db.prepare(
    `SELECT COUNT(*) as c FROM votes v
     WHERE (SELECT COUNT(*) FROM punk_traits WHERE punk_id = v.winner_id) = ?
     AND (SELECT COUNT(*) FROM punk_traits WHERE punk_id = v.loser_id) = ?`
  );

  const matchups: TraitMatchup[] = [];
  for (const [a, b] of pairs) {
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    const aWins = (stmt.get(aNum, bNum) as { c: number }).c;
    const bWins = (stmt.get(bNum, aNum) as { c: number }).c;
    const total = aWins + bWins;
    if (total === 0) continue;
    const aPct = Math.round((aWins / total) * 100);
    if (aPct >= 50) {
      matchups.push({ traitA: a, traitB: b, aWins, bWins, total, aPct });
    } else {
      matchups.push({ traitA: b, traitB: a, aWins: bWins, bWins: aWins, total, aPct: 100 - aPct });
    }
  }
  matchups.sort((a, b) => Math.abs(b.aPct - 50) - Math.abs(a.aPct - 50));
  return matchups;
}

function buildTraitCountFocusedMatchups(
  focusTrait: string,
  labels: { trait: string }[],
  db: ReturnType<typeof getDb>
): TraitMatchup[] {
  const focusNum = parseInt(focusTrait);
  const stmt = db.prepare(
    `SELECT COUNT(*) as c FROM votes v
     WHERE (SELECT COUNT(*) FROM punk_traits WHERE punk_id = v.winner_id) = ?
     AND (SELECT COUNT(*) FROM punk_traits WHERE punk_id = v.loser_id) = ?`
  );

  const matchups: TraitMatchup[] = [];
  for (const { trait: b } of labels) {
    const bNum = parseInt(b);
    if (bNum === focusNum) continue;
    const aWins = (stmt.get(focusNum, bNum) as { c: number }).c;
    const bWins = (stmt.get(bNum, focusNum) as { c: number }).c;
    const total = aWins + bWins;
    if (total === 0) continue;
    const aPct = Math.round((aWins / total) * 100);
    matchups.push({ traitA: focusTrait, traitB: b, aWins, bWins, total, aPct });
  }
  matchups.sort((a, b) => b.aPct - a.aPct);
  return matchups;
}

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const focusTrait = searchParams.get("trait");

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

  // Build trait-count virtual traits ("1 Trait", "2 Traits", etc.)
  const traitCounts = db
    .prepare(
      `SELECT COUNT(pt.trait) as cnt, pt.punk_id
       FROM punk_traits pt
       JOIN punks p ON pt.punk_id = p.id
       WHERE p.wins + p.losses > 0
       GROUP BY pt.punk_id`
    )
    .all() as { cnt: number; punk_id: number }[];

  const countSet = new Set(traitCounts.map((r) => r.cnt));
  const traitCountLabels = Array.from(countSet)
    .sort((a, b) => a - b)
    .map((n) => ({ trait: `${n} Trait${n === 1 ? "" : "s"}` }));

  if (focusTrait) {
    const isType = TYPES.has(focusTrait);
    const isTraitCount = /^\d+ Traits?$/.test(focusTrait);
    let opponents: { trait: string }[];
    if (isTraitCount) {
      opponents = traitCountLabels;
    } else if (isType) {
      opponents = allTraits.filter((t) => TYPES.has(t.trait));
    } else {
      opponents = allTraits.filter((t) => !TYPES.has(t.trait));
    }

    if (isTraitCount) {
      const matchups = buildTraitCountFocusedMatchups(focusTrait, traitCountLabels, db);
      return NextResponse.json({
        focusTrait,
        typeMatchups: [],
        accessoryMatchups: [],
        traitCountMatchups: matchups,
      });
    }

    const matchups = buildFocusedMatchups(focusTrait, opponents, db);
    return NextResponse.json({
      focusTrait,
      typeMatchups: isType ? matchups : [],
      accessoryMatchups: isType ? [] : matchups,
      traitCountMatchups: [],
    });
  }

  const typeTraits = allTraits.filter((t) => TYPES.has(t.trait));
  const accessoryTraits = allTraits.filter((t) => !TYPES.has(t.trait));

  const typeMatchups = buildMatchups(typeTraits, db, 6);
  const accessoryMatchups = buildMatchups(accessoryTraits, db, 20);
  const traitCountMatchups = buildTraitCountMatchups(traitCountLabels, db, 10);

  return NextResponse.json({ typeMatchups, accessoryMatchups, traitCountMatchups });
}
