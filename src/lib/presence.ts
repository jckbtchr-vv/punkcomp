// In-memory presence tracker
// Tracks last-seen timestamp per IP, considers active if seen within TTL

const TTL_MS = 60_000; // 60s - if no heartbeat in 60s, considered offline

const active = new Map<string, number>();

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 30_000) return;
  lastCleanup = now;
  const cutoff = now - TTL_MS;
  for (const [ip, ts] of active) {
    if (ts < cutoff) active.delete(ip);
  }
}

export function heartbeat(ip: string) {
  cleanup();
  active.set(ip, Date.now());
}

export function getOnlineCount(): number {
  cleanup();
  const cutoff = Date.now() - TTL_MS;
  let count = 0;
  for (const ts of active.values()) {
    if (ts >= cutoff) count++;
  }
  return count;
}
