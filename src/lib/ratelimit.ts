// Simple in-memory IP rate limiter
// Tracks vote timestamps per IP, cleans up automatically

const WINDOW_MS = 60_000; // 1 minute window
const MAX_VOTES = 30; // max votes per window per IP

const votes = new Map<string, number[]>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  const cutoff = now - WINDOW_MS;
  for (const [ip, timestamps] of votes) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) {
      votes.delete(ip);
    } else {
      votes.set(ip, recent);
    }
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
