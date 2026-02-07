import crypto from "crypto";

// Server-side matchup tokens to prevent arbitrary vote submissions
// Token = HMAC of punk IDs + timestamp, valid for 5 minutes

const SECRET = crypto.randomBytes(32).toString("hex");
const TOKEN_TTL_MS = 5 * 60_000; // 5 minutes

const usedTokens = new Set<string>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  usedTokens.clear(); // expired tokens are rejected by timestamp check anyway
}

export function createMatchupToken(punkA: number, punkB: number): string {
  const ts = Date.now();
  const pair = [punkA, punkB].sort().join(":");
  const data = `${pair}:${ts}`;
  const hmac = crypto.createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 16);
  return `${ts}.${hmac}`;
}

export function validateMatchupToken(
  token: string,
  punkA: number,
  punkB: number
): boolean {
  cleanup();

  if (usedTokens.has(token)) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const ts = parseInt(parts[0], 10);
  if (isNaN(ts)) return false;

  // Check expiry
  if (Date.now() - ts > TOKEN_TTL_MS) return false;

  // Verify HMAC
  const pair = [punkA, punkB].sort().join(":");
  const data = `${pair}:${ts}`;
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 16);

  if (parts[1] !== expected) return false;

  // Mark as used (one-time use)
  usedTokens.add(token);
  return true;
}
