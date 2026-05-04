import { getDb } from "./db";

const BASE_URL = "https://cryptopunks.app/api";
const CACHE_DURATION_FLOOR = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION_PUNK = 60 * 1000; // 1 minute
const CACHE_DURATION_COLLECTORS = 30 * 60 * 1000; // 30 minutes

// Types
export interface PunkMarketData {
  id: number;
  owner: string | null;
  ownerEns: string | null;
  isForSale: boolean;
  listingPrice: number | null; // in ETH
  hasBid: boolean;
  bidPrice: number | null; // in ETH
}

export interface RecentSale {
  punkId: number;
  price: number; // in ETH
  from: string;
  to: string;
  timestamp: number;
  blockNumber: number;
}

export interface CollectorData {
  address: string;
  ensName: string | null;
  punkIds: number[];
  punkCount: number;
}

// Fetch individual punk market data
export async function fetchPunkMarketData(id: number): Promise<PunkMarketData | null> {
  try {
    const res = await fetch(`${BASE_URL}/punks/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Parse response - structure based on API docs
    const punk = data.punk || data;

    return {
      id,
      owner: punk.owner || null,
      ownerEns: punk.ownerEns || punk.ens || null,
      isForSale: !!punk.forSale || !!punk.isForSale,
      listingPrice: punk.minValue ? Number(punk.minValue) / 1e18 : null,
      hasBid: !!punk.hasBid || (punk.bidValue && Number(punk.bidValue) > 0),
      bidPrice: punk.bidValue ? Number(punk.bidValue) / 1e18 : null,
    };
  } catch (error) {
    console.error(`Failed to fetch market data for punk ${id}:`, error);
    return null;
  }
}

// Fetch current floor price
export async function fetchFloorPrice(): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/punks?action=floor`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    // API returns floor in wei
    if (data.floor) {
      return Number(data.floor) / 1e18;
    }
    if (data.floorPrice) {
      return Number(data.floorPrice) / 1e18;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch floor price:", error);
    return null;
  }
}

// Fetch recent sales
export async function fetchRecentSales(count = 10): Promise<RecentSale[]> {
  try {
    const res = await fetch(`${BASE_URL}/punks?action=recent-sales&count=${count}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    // Handle various API response formats
    let sales = data.sales || data.recentSales || data;

    // If not an array, return empty
    if (!Array.isArray(sales)) return [];

    return sales
      .map((sale: {
        punkIndex?: number;
        punkId?: number;
        index?: number;
        value?: string;
        price?: string;
        amount?: string;
        from?: string;
        seller?: string;
        to?: string;
        buyer?: string;
        timestamp?: number;
        blockNumber?: number;
        block?: number;
      }) => ({
        punkId: sale.punkIndex ?? sale.punkId ?? sale.index ?? -1,
        price: Number(sale.value || sale.price || sale.amount || 0) / 1e18,
        from: sale.from || sale.seller || "",
        to: sale.to || sale.buyer || "",
        timestamp: sale.timestamp || 0,
        blockNumber: sale.blockNumber || sale.block || 0,
      }))
      .filter((sale) => sale.punkId >= 0);
  } catch (error) {
    console.error("Failed to fetch recent sales:", error);
    return [];
  }
}

// Fetch holder leaderboard (top collectors)
export async function fetchHolderLeaderboard(): Promise<CollectorData[]> {
  try {
    const res = await fetch(`${BASE_URL}/punks?action=leaderboard`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    let holders = data.topHolders || data.holders || data.leaderboard || data.data?.topHolders;

    // If not an array, return empty
    if (!Array.isArray(holders)) return [];

    return holders.map((holder: {
      address?: string;
      owner?: string;
      ens?: string;
      ensName?: string;
      ensAddress?: string;
      punks?: number[];
      punkIds?: number[];
      count?: number;
      punkCount?: number;
    }) => ({
      address: holder.address || holder.owner || "",
      ensName: holder.ensAddress || holder.ens || holder.ensName || null,
      punkIds: holder.punks || holder.punkIds || [],
      punkCount: holder.punkCount || holder.count || (holder.punks?.length ?? 0),
    }));
  } catch (error) {
    console.error("Failed to fetch holder leaderboard:", error);
    return [];
  }
}

// Cache helpers using sync_meta table
export function getCachedFloor(): { price: number; updatedAt: number } | null {
  const db = getDb();
  const priceRow = db.prepare("SELECT value FROM sync_meta WHERE key = 'floor_price'").get() as { value: string } | undefined;
  const timeRow = db.prepare("SELECT value FROM sync_meta WHERE key = 'floor_updated'").get() as { value: string } | undefined;

  if (!priceRow || !timeRow) return null;

  const updatedAt = parseInt(timeRow.value);
  if (Date.now() - updatedAt > CACHE_DURATION_FLOOR) return null;

  return {
    price: parseFloat(priceRow.value),
    updatedAt,
  };
}

export function setCachedFloor(price: number): void {
  const db = getDb();
  const now = Date.now().toString();
  db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('floor_price', ?)").run(price.toString());
  db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('floor_updated', ?)").run(now);
}

// Get floor price with caching
export async function getFloorPrice(): Promise<number | null> {
  const cached = getCachedFloor();
  if (cached) return cached.price;

  const price = await fetchFloorPrice();
  if (price !== null) {
    setCachedFloor(price);
  }
  return price;
}

// Cache punk market data
export function getCachedPunkMarket(id: number): PunkMarketData | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM market_cache WHERE punk_id = ? AND datetime(updated_at) > datetime('now', '-1 minutes')"
  ).get(id) as {
    punk_id: number;
    owner_address: string | null;
    owner_ens: string | null;
    listing_price_eth: number | null;
    bid_price_eth: number | null;
    is_for_sale: number;
    has_bid: number;
  } | undefined;

  if (!row) return null;

  return {
    id: row.punk_id,
    owner: row.owner_address,
    ownerEns: row.owner_ens,
    isForSale: !!row.is_for_sale,
    listingPrice: row.listing_price_eth,
    hasBid: !!row.has_bid,
    bidPrice: row.bid_price_eth,
  };
}

export function setCachedPunkMarket(data: PunkMarketData): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO market_cache
    (punk_id, owner_address, owner_ens, listing_price_eth, bid_price_eth, is_for_sale, has_bid, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    data.id,
    data.owner,
    data.ownerEns,
    data.listingPrice,
    data.bidPrice,
    data.isForSale ? 1 : 0,
    data.hasBid ? 1 : 0
  );
}

// Get punk market data with caching
export async function getPunkMarketData(id: number): Promise<PunkMarketData | null> {
  const cached = getCachedPunkMarket(id);
  if (cached) return cached;

  const data = await fetchPunkMarketData(id);
  if (data) {
    setCachedPunkMarket(data);
  }
  return data;
}

// Collector aggregation with ELO data
export interface CollectorWithElo extends CollectorData {
  avgElo: number;
  totalElo: number;
  rankedPunkCount: number;
}

export function getCollectorsWithElo(): CollectorWithElo[] {
  const db = getDb();

  // Get collectors from cache
  const collectors = db.prepare(`
    SELECT address, ens_name, punk_ids, punk_count
    FROM collectors
    ORDER BY punk_count DESC
  `).all() as {
    address: string;
    ens_name: string | null;
    punk_ids: string;
    punk_count: number;
  }[];

  // Compute ELO for each collector based on their punk IDs
  return collectors.map(c => {
    const punkIds: number[] = JSON.parse(c.punk_ids || "[]");

    if (punkIds.length === 0) {
      return {
        address: c.address,
        ensName: c.ens_name,
        punkIds: [],
        punkCount: c.punk_count,
        avgElo: 1500,
        totalElo: 0,
        rankedPunkCount: 0,
      };
    }

    // Get ELO stats for this collector's punks
    const stats = db.prepare(`
      SELECT
        COALESCE(AVG(elo), 1500) as avg_elo,
        COALESCE(SUM(elo), 0) as total_elo,
        COUNT(CASE WHEN wins + losses > 0 THEN 1 END) as ranked_count
      FROM punks
      WHERE id IN (${punkIds.join(",")})
    `).get() as { avg_elo: number; total_elo: number; ranked_count: number };

    return {
      address: c.address,
      ensName: c.ens_name,
      punkIds,
      punkCount: c.punk_count,
      avgElo: Math.round(stats.avg_elo * 100) / 100,
      totalElo: Math.round(stats.total_elo * 100) / 100,
      rankedPunkCount: stats.ranked_count,
    };
  });
}

// Fetch punk IDs for a specific account
async function fetchAccountPunks(address: string): Promise<number[]> {
  try {
    const res = await fetch(`${BASE_URL}/account/${address}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    const owned = data.data?.owned || data.owned || [];
    if (!Array.isArray(owned)) return [];

    return owned.map((p: { index?: number }) => p.index).filter((id: number | undefined): id is number => typeof id === 'number');
  } catch (error) {
    console.error(`Failed to fetch account punks for ${address}:`, error);
    return [];
  }
}

// Sync collectors from API
export async function syncCollectors(): Promise<number> {
  const holders = await fetchHolderLeaderboard();
  if (holders.length === 0) return 0;

  const db = getDb();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO collectors (address, ens_name, punk_ids, punk_count, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  // Fetch punk IDs for top 30 collectors (to compute ELO)
  const topHolders = holders.slice(0, 30);
  const holdersWithPunks = await Promise.all(
    topHolders.map(async (holder) => {
      const punkIds = await fetchAccountPunks(holder.address);
      return { ...holder, punkIds };
    })
  );

  const sync = db.transaction(() => {
    // Insert top holders with punk IDs
    for (const holder of holdersWithPunks) {
      insert.run(
        holder.address,
        holder.ensName,
        JSON.stringify(holder.punkIds),
        holder.punkCount
      );
    }
    // Insert remaining holders without punk IDs
    for (const holder of holders.slice(30)) {
      insert.run(
        holder.address,
        holder.ensName,
        JSON.stringify([]),
        holder.punkCount
      );
    }
  });

  sync();

  // Update sync timestamp
  db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('collectors_synced', ?)").run(
    new Date().toISOString()
  );

  return holders.length;
}

// Check if collectors need refresh
export function collectorsNeedRefresh(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'collectors_synced'").get() as { value: string } | undefined;

  if (!row) return true;

  const lastSync = new Date(row.value).getTime();
  return Date.now() - lastSync > CACHE_DURATION_COLLECTORS;
}
