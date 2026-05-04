"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PunkImage from "@/components/PunkImage";

interface PunkData {
  id: number;
  rank: number | null;
  totalRanked: number;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  lastSaleEth: number | null;
  lastSaleDate: string | null;
  type: string | null;
  gender: string | null;
  skinTone: string | null;
  accessoryCount: number | null;
  traits: string[];
}

interface MarketData {
  owner: string | null;
  ownerEns: string | null;
  isForSale: boolean;
  listingPrice: number | null;
  hasBid: boolean;
  bidPrice: number | null;
}

interface FloorComparison {
  percent: number;
  label: string;
}

interface HistoryEntry {
  id: number;
  won: boolean;
  opponentId: number;
  createdAt: string;
}

function shortenAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function PunkDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [punk, setPunk] = useState<PunkData | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [floorComparison, setFloorComparison] = useState<FloorComparison | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPunk = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/punk/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPunk(data.punk);
    setMarket(data.market);
    setFloor(data.floor);
    setFloorComparison(data.floorComparison);
    setHistory(data.history);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!isNaN(id)) fetchPunk();
  }, [id, fetchPunk]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="font-mono-caps text-xs text-neutral-500">LOADING...</span>
      </main>
    );
  }

  if (!punk) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="font-mono-caps text-xs text-neutral-500">PUNK NOT FOUND</span>
        <Link href="/leaderboard" className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors">
          LEADERBOARD
        </Link>
      </main>
    );
  }

  const totalGames = punk.wins + punk.losses;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">PVP</h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          PUNK #{id.toString().padStart(4, "0")}
        </p>
      </div>

      {/* Nav */}
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors">
          &larr; VOTE
        </Link>
        <Link href="/leaderboard" className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors">
          LEADERBOARD
        </Link>
      </div>

      {/* Punk card */}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <PunkImage punkId={punk.id} className="w-[160px] sm:w-[200px] rounded-xl" />
          <h2 className="font-mono-caps text-lg mt-4 text-white">
            #{punk.id.toString().padStart(4, "0")}
          </h2>
          {/* Market badges */}
          {(market?.isForSale || market?.hasBid) && (
            <div className="flex gap-2 mt-2">
              {market.isForSale && (
                <span className="font-mono-caps text-[9px] px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                  FOR SALE
                </span>
              )}
              {market.hasBid && (
                <span className="font-mono-caps text-[9px] px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  HAS BID
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">RANK</div>
            <div className="font-mono-caps text-sm text-white">
              {punk.rank ? `${punk.rank} / ${punk.totalRanked}` : "UNRANKED"}
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">ELO</div>
            <div className="font-mono-caps text-sm text-green-400">{Math.round(punk.elo)}</div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">WIN RATE</div>
            <div className="font-mono-caps text-sm text-white">
              {totalGames > 0 ? `${punk.winRate}%` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">WINS</div>
            <div className="font-mono-caps text-sm text-green-400">{punk.wins}</div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">LOSSES</div>
            <div className="font-mono-caps text-sm text-red-400">{punk.losses}</div>
          </div>
          <div className="text-center">
            <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">MATCHUPS</div>
            <div className="font-mono-caps text-sm text-white">{totalGames}</div>
          </div>
        </div>

        {/* Market Data */}
        {market && (
          <div className="mb-8">
            <h3 className="font-mono-caps text-[10px] text-neutral-600 mb-3">MARKET</h3>
            <div className="grid grid-cols-2 gap-4">
              {market.owner && (
                <div>
                  <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">OWNER</div>
                  <a
                    href={`https://etherscan.io/address/${market.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-caps text-xs text-neutral-300 hover:text-white transition-colors"
                  >
                    {market.ownerEns || shortenAddress(market.owner)}
                  </a>
                </div>
              )}
              {floor && (
                <div>
                  <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">FLOOR</div>
                  <span className="font-mono-caps text-xs text-neutral-300">
                    {floor.toFixed(2)} ETH
                  </span>
                </div>
              )}
              {market.isForSale && market.listingPrice && (
                <div>
                  <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">LISTING</div>
                  <span className="font-mono-caps text-xs text-green-400">
                    {market.listingPrice.toFixed(2)} ETH
                  </span>
                </div>
              )}
              {market.hasBid && market.bidPrice && (
                <div>
                  <div className="font-mono-caps text-[10px] text-neutral-500 mb-1">TOP BID</div>
                  <span className="font-mono-caps text-xs text-blue-400">
                    {market.bidPrice.toFixed(2)} ETH
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Traits */}
        <div className="mb-8">
          <h3 className="font-mono-caps text-[10px] text-neutral-600 mb-3">TRAITS</h3>
          <div className="flex flex-wrap gap-2">
            {punk.type && (
              <Link
                href={`/matchups?trait=${encodeURIComponent(punk.type)}`}
                className="font-mono-caps text-[10px] px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-500 hover:text-white transition-colors"
              >
                {punk.type}
              </Link>
            )}
            {punk.traits.map((trait) => (
              <Link
                key={trait}
                href={`/matchups?trait=${encodeURIComponent(trait)}`}
                className="font-mono-caps text-[10px] px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-colors"
              >
                {trait}
              </Link>
            ))}
          </div>
        </div>

        {/* Price */}
        {punk.lastSaleEth && (
          <div className="mb-8">
            <h3 className="font-mono-caps text-[10px] text-neutral-600 mb-3">LAST SALE</h3>
            <div className="flex items-center gap-3">
              <span className="font-mono-caps text-sm text-white">
                {punk.lastSaleEth.toFixed(2)} ETH
              </span>
              {floorComparison && (
                <span className={`font-mono-caps text-[10px] ${
                  floorComparison.percent >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {floorComparison.label}
                </span>
              )}
            </div>
            {punk.lastSaleDate && (
              <div className="font-mono-caps text-[10px] text-neutral-500 mt-1">
                {punk.lastSaleDate}
              </div>
            )}
          </div>
        )}

        {/* Vote history */}
        <div>
          <h3 className="font-mono-caps text-[10px] text-neutral-600 mb-3">
            MATCH HISTORY {history.length > 0 && `(${history.length})`}
          </h3>
          {history.length === 0 ? (
            <div className="font-mono-caps text-[10px] text-neutral-600">NO MATCHES YET</div>
          ) : (
            <div className="flex flex-col gap-1">
              {history.map((h) => (
                <Link
                  key={h.id}
                  href={`/punk/${h.opponentId}`}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-neutral-900/50 transition-colors group"
                >
                  <span className={`font-mono-caps text-[10px] w-8 shrink-0 ${h.won ? "text-green-400" : "text-red-400"}`}>
                    {h.won ? "WIN" : "LOSS"}
                  </span>
                  <span className="font-mono-caps text-[10px] text-neutral-500">VS</span>
                  <PunkImage punkId={h.opponentId} className="w-6 h-6 rounded-full shrink-0" />
                  <span className="font-mono-caps text-[10px] text-neutral-400 group-hover:text-white transition-colors">
                    #{h.opponentId.toString().padStart(4, "0")}
                  </span>
                  <span className="font-mono-caps text-[10px] text-neutral-700 ml-auto">
                    {new Date(h.createdAt + "Z").toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
