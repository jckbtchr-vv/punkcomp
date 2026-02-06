import { getDb } from "./db";

const CRYPTOPUNKS_CONTRACT = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";

interface AlchemySale {
  tokenId: string;
  sellerFee: { amount: string };
  protocolFee: { amount: string };
  royaltyFee: { amount: string };
  blockNumber: number;
}

interface AlchemyResponse {
  nftSales: AlchemySale[];
  pageKey?: string;
}

// Fetch all CryptoPunks sales from Alchemy and store the last sale per punk
export async function syncPrices(): Promise<{
  synced: number;
  pages: number;
}> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY not set");
  }

  const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTSales`;
  const seen = new Map<number, { eth: number; block: number }>();
  let pageKey: string | undefined;
  let pages = 0;

  // Fetch sales in descending order (most recent first)
  // For each punk, keep only the first (most recent) sale we encounter
  do {
    const url = new URL(baseUrl);
    url.searchParams.set("contractAddress", CRYPTOPUNKS_CONTRACT);
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", "1000");
    if (pageKey) url.searchParams.set("pageKey", pageKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Alchemy API error: ${res.status} ${res.statusText}`);
    }

    const data: AlchemyResponse = await res.json();
    pages++;

    for (const sale of data.nftSales) {
      const tokenId = parseInt(sale.tokenId);
      if (!seen.has(tokenId)) {
        const totalWei =
          BigInt(sale.sellerFee.amount) +
          BigInt(sale.protocolFee.amount) +
          BigInt(sale.royaltyFee.amount);
        const eth = Number(totalWei) / 1e18;
        seen.set(tokenId, { eth, block: sale.blockNumber });
      }
    }

    pageKey = data.pageKey;

    // Small delay to be respectful of rate limits
    if (pageKey) {
      await new Promise((r) => setTimeout(r, 200));
    }
  } while (pageKey);

  // Write all prices to database
  const db = getDb();
  const update = db.prepare(
    "UPDATE punks SET last_sale_eth = ?, last_sale_date = ? WHERE id = ?"
  );

  const write = db.transaction(() => {
    for (const [tokenId, { eth, block }] of seen) {
      update.run(eth, `block:${block}`, tokenId);
    }
    // Record sync time
    db.prepare(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_price_sync', ?)"
    ).run(new Date().toISOString());
  });

  write();

  return { synced: seen.size, pages };
}

export function getLastSyncTime(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM sync_meta WHERE key = 'last_price_sync'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

export function hasPriceData(): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as c FROM punks WHERE last_sale_eth IS NOT NULL")
    .get() as { c: number };
  return row.c > 0;
}
