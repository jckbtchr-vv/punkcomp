"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OpepenImage from "@/components/OpepenImage";
import Link from "next/link";

type Tab = "opepen" | "sets" | "collectors";

interface Opepen {
  id: number;
  elo: number;
  wins: number;
  losses: number;
  editionSize: number;
}

interface OpepenSet {
  setId: number;
  name: string;
  artist: string;
  imageCount: number;
  avgElo: number;
  totalWins: number;
  totalLosses: number;
}

interface Collector {
  address: string;
  ensName: string | null;
  opepenCount: number;
  ratedCount: number;
  avgElo: number;
  totalElo: number;
  totalWins: number;
  totalLosses: number;
}

function EloBar({ elo, min, max }: { elo: number; min: number; max: number }) {
  const range = max - min;
  const pct = range > 0 ? ((elo - min) / range) * 100 : 50;
  const width = Math.max(2, pct);
  return (
    <div
      className="absolute inset-0 rounded-lg opacity-100 pointer-events-none"
      style={{
        width: `${width}%`,
        background: "linear-gradient(90deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)",
      }}
    />
  );
}

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "—";
  return `${Math.round((wins / total) * 100)}%`;
}

export default function OpepenLeaderboardPage() {
  const [tab, setTab] = useState<Tab>("opepen");
  const [opepen, setOpepen] = useState<Opepen[]>([]);
  const [sets, setSets] = useState<OpepenSet[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [collectorsEloMin, setCollectorsEloMin] = useState(1500);
  const [collectorsEloMax, setCollectorsEloMax] = useState(1500);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVotes, setTotalVotes] = useState(0);
  const [eloMin, setEloMin] = useState(1500);
  const [eloMax, setEloMax] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchLeaderboard = useCallback(async (p: number, q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("search", q);
    const res = await fetch(`/api/opepen/leaderboard?${params}`);
    const data = await res.json();
    setOpepen(data.opepen);
    setTotalPages(data.totalPages);
    setTotalVotes(data.totalVotes);
    setEloMin(data.eloMin);
    setEloMax(data.eloMax);
    setPage(p);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/opepen/sets");
    const data = await res.json();
    setSets(data.sets);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  const fetchCollectors = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/opepen/collectors");
    const data = await res.json();
    setCollectors(data.collectors);
    setCollectorsEloMin(data.eloMin);
    setCollectorsEloMax(data.eloMax);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    fetchLeaderboard(1);
  }, [fetchLeaderboard]);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchLeaderboard(1, value);
    }, 300);
  };

  const clearSearch = () => {
    setSearch("");
    fetchLeaderboard(1, "");
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "sets" && sets.length === 0) {
      fetchSets();
    } else if (t === "collectors" && collectors.length === 0) {
      fetchCollectors();
    }
  };

  const tabClass = (t: Tab) =>
    `font-mono-caps text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer ${
      tab === t
        ? "text-white bg-neutral-800"
        : "text-neutral-500 hover:text-white"
    }`;

  // Compute set elo range for bars
  const setsEloMin = sets.length > 0 ? Math.min(...sets.map((s) => s.avgElo)) : 1500;
  const setsEloMax = sets.length > 0 ? Math.max(...sets.map((s) => s.avgElo)) : 1500;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PVP
        </h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          {totalVotes.toLocaleString()} OPEPEN VOTES
        </p>
      </div>

      {/* Nav */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/opepen"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          &larr; VOTE
        </Link>
        <button onClick={() => switchTab("opepen")} className={tabClass("opepen")}>
          OPEPEN
        </button>
        <button onClick={() => switchTab("sets")} className={tabClass("sets")}>
          SETS
        </button>
        <button onClick={() => switchTab("collectors")} className={tabClass("collectors")}>
          COLLECTORS
        </button>
        <Link
          href="/opepen/feed"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          FEED
        </Link>
      </div>

      {/* Search (opepen tab only) */}
      {tab === "opepen" && (
        <div className="mb-4 w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="SEARCH OPEPEN # ..."
              className="font-mono-caps text-xs w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-2 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 text-xs cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`w-full max-w-2xl transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
        {tab === "opepen" && (
          <>
            {hasLoaded && opepen.length === 0 ? (
              <div className="text-neutral-500 text-sm text-center mt-12 font-mono-caps">
                {search ? "OPEPEN NOT FOUND" : "NO VOTES YET. GO VOTE!"}
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1.2rem_1fr_3rem_2.5rem_2.5rem] gap-x-2 items-center font-mono-caps text-[10px] text-neutral-500 mb-2 pl-2 pr-0">
                  <span>#</span>
                  <span>OPEPEN</span>
                  <span className="text-right">ELO</span>
                  <span className="text-right">WIN</span>
                  <span className="text-right">W/L</span>
                </div>

                <div className="flex flex-col gap-1" style={{ minHeight: 400 }}>
                  {opepen.map((op, i) => {
                    const rank = search ? "—" : (page - 1) * 50 + i + 1;
                    return (
                      <Link
                        key={op.id}
                        href={`/opepen/${op.id}`}
                        className="relative grid grid-cols-[1.2rem_1fr_3rem_2.5rem_2.5rem] gap-x-2 items-center pl-2 pr-0 py-2 rounded-lg overflow-hidden hover:bg-neutral-800/30 transition-colors"
                      >
                        <EloBar elo={op.elo} min={eloMin} max={eloMax} />
                        <span className="relative font-mono-caps text-[10px] text-neutral-600">
                          {rank}
                        </span>
                        <div className="relative flex items-center gap-3">
                          <OpepenImage opepenId={op.id} className="w-8 h-8 shrink-0 rounded-full" />
                          <span className="font-mono-caps text-[10px] font-bold text-neutral-300 w-14 shrink-0">
                            #{op.id}
                          </span>
                          {op.editionSize > 1 && (
                            <span className="font-mono-caps text-[9px] text-neutral-600">
                              1/{op.editionSize}
                            </span>
                          )}
                        </div>
                        <span className="relative font-mono-caps text-[10px] font-bold text-green-400 text-right">
                          {Math.round(op.elo)}
                        </span>
                        <span className="relative font-mono-caps text-[10px] text-neutral-400 text-right">
                          {winRate(op.wins, op.losses)}
                        </span>
                        <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                          {op.wins}/{op.losses}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {!search && (
                  <div className="flex items-center justify-center gap-4 mt-6 h-8">
                    {totalPages > 1 && (
                      <>
                        <button
                          onClick={() => fetchLeaderboard(page - 1)}
                          disabled={page <= 1 || loading}
                          className="font-mono-caps text-xs text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors"
                        >
                          &larr; PREV
                        </button>
                        <span className="font-mono-caps text-[10px] text-neutral-600">
                          {page} / {totalPages}
                        </span>
                        <button
                          onClick={() => fetchLeaderboard(page + 1)}
                          disabled={page >= totalPages || loading}
                          className="font-mono-caps text-xs text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-default cursor-pointer transition-colors"
                        >
                          NEXT &rarr;
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "sets" && (
          <>
            {hasLoaded && sets.length === 0 ? (
              <div className="text-neutral-500 text-sm text-center mt-12 font-mono-caps">
                NO SET DATA YET. VOTE MORE TO POPULATE!
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1.2rem_1fr_3.5rem_3rem_3rem_2.5rem] gap-x-2 items-center font-mono-caps text-[10px] text-neutral-500 mb-2 pl-2 pr-0">
                  <span>#</span>
                  <span>SET</span>
                  <span className="text-right">AVG ELO</span>
                  <span className="text-right">IMAGES</span>
                  <span className="text-right">WIN</span>
                  <span className="text-right">W/L</span>
                </div>

                <div className="flex flex-col gap-1" style={{ minHeight: 400 }}>
                  {sets.map((set, i) => (
                    <div
                      key={set.setId}
                      className="relative grid grid-cols-[1.2rem_1fr_3.5rem_3rem_3rem_2.5rem] gap-x-2 items-center pl-2 pr-0 py-2 rounded-lg overflow-hidden"
                    >
                      <EloBar elo={set.avgElo} min={setsEloMin} max={setsEloMax} />
                      <span className="relative font-mono-caps text-[10px] text-neutral-600">
                        {i + 1}
                      </span>
                      <div className="relative flex flex-col min-w-0">
                        <span className="font-mono-caps text-[10px] font-bold text-neutral-300 truncate">
                          {set.name}
                        </span>
                        <span className="font-mono-caps text-[9px] text-neutral-600 truncate">
                          {set.artist}
                        </span>
                      </div>
                      <span className="relative font-mono-caps text-[10px] font-bold text-green-400 text-right">
                        {Math.round(set.avgElo)}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                        {set.imageCount}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-400 text-right">
                        {winRate(set.totalWins, set.totalLosses)}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                        {set.totalWins}/{set.totalLosses}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "collectors" && (
          <>
            {hasLoaded && collectors.length === 0 ? (
              <div className="text-neutral-500 text-sm text-center mt-12 font-mono-caps">
                NO COLLECTOR DATA YET. SYNC OPEPEN FIRST!
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1.2rem_1fr_3.5rem_3rem_3rem_2.5rem] gap-x-2 items-center font-mono-caps text-[10px] text-neutral-500 mb-2 pl-2 pr-0">
                  <span>#</span>
                  <span>COLLECTOR</span>
                  <span className="text-right">AVG ELO</span>
                  <span className="text-right">RATED</span>
                  <span className="text-right">WIN</span>
                  <span className="text-right">W/L</span>
                </div>

                <div className="flex flex-col gap-1" style={{ minHeight: 400 }}>
                  {collectors.map((collector, i) => (
                    <a
                      key={collector.address}
                      href={`https://opepen.art/${collector.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative grid grid-cols-[1.2rem_1fr_3.5rem_3rem_3rem_2.5rem] gap-x-2 items-center pl-2 pr-0 py-2 rounded-lg overflow-hidden hover:bg-neutral-800/30 transition-colors"
                    >
                      <EloBar elo={collector.avgElo} min={collectorsEloMin} max={collectorsEloMax} />
                      <span className="relative font-mono-caps text-[10px] text-neutral-600">
                        {i + 1}
                      </span>
                      <div className="relative flex flex-col min-w-0">
                        <span className="font-mono-caps text-[10px] font-bold text-neutral-300 truncate">
                          {collector.ensName || `${collector.address.slice(0, 6)}...${collector.address.slice(-4)}`}
                        </span>
                        <span className="font-mono-caps text-[9px] text-neutral-600">
                          {collector.opepenCount} OPEPEN
                        </span>
                      </div>
                      <span className="relative font-mono-caps text-[10px] font-bold text-green-400 text-right">
                        {Math.round(collector.avgElo)}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                        {collector.ratedCount}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-400 text-right">
                        {winRate(collector.totalWins, collector.totalLosses)}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                        {collector.totalWins}/{collector.totalLosses}
                      </span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
