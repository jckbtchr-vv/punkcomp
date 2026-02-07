// Simple in-memory IP rate limiter
// Tracks vote timestamps per IP, cleans up automatically

const WINDOW_MS = 60_000; // 1 minute window
const MAX_VOTES = 15; // max votes per window per IP

const votes = new Map<string, number[]>();

// Track per-IP per-punk votes (prevent boosting a single punk)
const PUNK_WINDOW_MS = 3_600_000; // 1 hour
const MAX_PUNK_VOTES = 3; // max votes involving same punk per IP per hour
const punkVotes = new Map<string, number[]>(); // key: `${ip}:${punkId}`

// Track per-IP pair votes (prevent repeated same matchup)
const PAIR_COOLDOWN_MS = 3_600_000; // 1 hour
const pairVotes = new Map<string, number>(); // key: `${ip}:${pairKey}` → timestamp

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS;
  for (const [ip, timestamps] of votes) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) votes.delete(ip);
    else votes.set(ip, recent);
  }

  const punkCutoff = now - PUNK_WINDOW_MS;
  for (const [key, timestamps] of punkVotes) {
    const recent = timestamps.filter((t) => t > punkCutoff);
    if (recent.length === 0) punkVotes.delete(key);
    else punkVotes.set(key, recent);
  }

  for (const [key, ts] of pairVotes) {
    if (ts < now - PAIR_COOLDOWN_MS) pairVotes.delete(key);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  cleanup();

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = (votes.get(ip) || []).filter((t) => t > cutoff);

  if (timestamps.length >= MAX_VOTES) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  votes.set(ip, timestamps);

  return { allowed: true, remaining: MAX_VOTES - timestamps.length };
}

export function checkPunkLimit(ip: string, punkId: number): boolean {
  const now = Date.now();
  const cutoff = now - PUNK_WINDOW_MS;
  const key = `${ip}:${punkId}`;
  const timestamps = (punkVotes.get(key) || []).filter((t) => t > cutoff);
  if (timestamps.length >= MAX_PUNK_VOTES) return false;
  timestamps.push(now);
  punkVotes.set(key, timestamps);
  return true;
}

export function checkPairLimit(ip: string, punkA: number, punkB: number): boolean {
  const now = Date.now();
  const pairKey = [punkA, punkB].sort().join(":");
  const key = `${ip}:${pairKey}`;
  const lastVote = pairVotes.get(key);
  if (lastVote && now - lastVote < PAIR_COOLDOWN_MS) return false;
  pairVotes.set(key, now);
  return true;
}
