"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PunkImage from "@/components/PunkImage";
import Link from "next/link";

type Tab = "punks" | "traits";

interface Punk {
  id: number;
  elo: number;
  wins: number;
  losses: number;
  last_sale_eth: number | null;
  dislocation: number | null;
}

interface Trait {
  trait: string;
  punk_count: number;
  avg_elo: number;
  total_wins: number;
  total_losses: number;
}

function DislocationBadge({ value }: { value: number }) {
  const color =
    value > 0
      ? "text-green-400"
      : value < 0
        ? "text-red-400"
        : "text-neutral-500";
  const label = value > 0 ? `+${value}` : `${value}`;
  return (
    <span className={`font-mono-caps text-[10px] font-bold ${color}`} title="Dislocation: aesthetic percentile minus price percentile">
      {label}
    </span>
  );
}

function EloBar({ elo, min, max }: { elo: number; min: number; max: number }) {
  const range = max - min;
  const pct = range > 0 ? ((elo - min) / range) * 100 : 50;
  // Ensure at least 2% width so every row has a visible bar
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

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("punks");
  const [punks, setPunks] = useState<Punk[]>([]);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [eloMin, setEloMin] = useState(1500);
  const [eloMax, setEloMax] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasPrices = punks.some((p) => p.last_sale_eth !== null);

  const fetchLeaderboard = useCallback(async (p: number, q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("search", q);
    const res = await fetch(`/api/leaderboard?${params}`);
    const data = await res.json();
    setPunks(data.punks);
    setTotalPages(data.totalPages);
    setTotalVotes(data.totalVotes);
    setTotalVoters(data.totalVoters ?? 0);
    setEloMin(data.eloMin);
    setEloMax(data.eloMax);
    setPage(p);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  const fetchTraits = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/traits");
    const data = await res.json();
    setTraits(data.traits);
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
    if (t === "traits" && traits.length === 0) {
      fetchTraits();
    }
  };

  const tabClass = (t: Tab) =>
    `font-mono-caps text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer ${
      tab === t
        ? "text-white bg-neutral-800"
        : "text-neutral-500 hover:text-white"
    }`;

  // Compute trait elo range for bars
  const traitEloMin = traits.length > 0 ? Math.min(...traits.map((t) => t.avg_elo)) : 1500;
  const traitEloMax = traits.length > 0 ? Math.max(...traits.map((t) => t.avg_elo)) : 1500;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header - fixed height */}
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PUNKCOMP
        </h1>
        <p className="font-mono-caps text-xs text-neutral-500">
          {totalVotes.toLocaleString()} VOTES{totalVoters >= 100 ? ` · ${totalVoters.toLocaleString()} VOTERS` : ""}
        </p>
      </div>

      {/* Nav */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          &larr; VOTE
        </Link>
        <button onClick={() => switchTab("punks")} className={tabClass("punks")}>
          PUNKS
        </button>
        <button onClick={() => switchTab("traits")} className={tabClass("traits")}>
          TRAITS
        </button>
        <Link
          href="/matchups"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          MATCHUPS
        </Link>
      </div>

      {/* Search (punks tab only) */}
      {tab === "punks" && (
        <div className="mb-4 w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="SEARCH PUNK # ..."
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

      {/* Content area */}
      <div className={`w-full max-w-2xl transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
        {tab === "punks" && (
          <>
            {hasLoaded && punks.length === 0 ? (
              <div className="text-neutral-500 text-sm text-center mt-12 font-mono-caps">
                {search ? "PUNK NOT FOUND" : "NO VOTES YET. GO VOTE!"}
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className={`grid gap-x-2 items-center font-mono-caps text-[10px] text-neutral-500 mb-2 pl-2 pr-0 ${hasPrices ? "grid-cols-[1.2rem_1fr_3rem_3rem_3rem_3rem_2.5rem]" : "grid-cols-[1.2rem_1fr_3rem_2.5rem_2.5rem]"}`}>
                  <span>#</span>
                  <span>PUNK</span>
                  <span className="text-right">ELO</span>
                  {hasPrices && <span className="text-right">ETH</span>}
                  {hasPrices && <span className="text-right">DLOC</span>}
                  <span className="text-right">WIN</span>
                  <span className="text-right">W/L</span>
                </div>

                <div className="flex flex-col gap-1" style={{ minHeight: 400 }}>
                  {punks.map((punk, i) => {
                    const rank = search ? "—" : (page - 1) * 50 + i + 1;
                    return (
                      <div
                        key={punk.id}
                        className={`relative grid gap-x-2 items-center pl-2 pr-0 py-2 rounded-lg overflow-hidden ${hasPrices ? "grid-cols-[1.2rem_1fr_3rem_3rem_3rem_3rem_2.5rem]" : "grid-cols-[1.2rem_1fr_3rem_2.5rem_2.5rem]"}`}
                      >
                        <EloBar elo={punk.elo} min={eloMin} max={eloMax} />
                        <span className="relative font-mono-caps text-[10px] text-neutral-600">
                          {rank}
                        </span>
                        <div className="relative flex items-center gap-3">
                          <PunkImage punkId={punk.id} className="w-8 shrink-0 rounded-full" />
                          <span className="font-mono-caps text-[10px] font-bold text-neutral-300">
                            #{punk.id.toString().padStart(4, "0")}
                          </span>
                        </div>
                        <span className="relative font-mono-caps text-[10px] font-bold text-green-400 text-right">
                          {Math.round(punk.elo)}
                        </span>
                        {hasPrices && (
                          <span className="relative font-mono-caps text-[10px] text-neutral-400 text-right">
                            {punk.last_sale_eth !== null
                              ? punk.last_sale_eth < 10
                                ? punk.last_sale_eth.toFixed(1)
                                : Math.round(punk.last_sale_eth)
                              : "—"}
                          </span>
                        )}
                        {hasPrices && (
                          <span className="relative text-right">
                            {punk.dislocation !== null ? (
                              <DislocationBadge value={punk.dislocation} />
                            ) : (
                              <span className="font-mono-caps text-[10px] text-neutral-700">—</span>
                            )}
                          </span>
                        )}
                        <span className="relative font-mono-caps text-[10px] text-neutral-400 text-right">
                          {winRate(punk.wins, punk.losses)}
                        </span>
                        <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                          {punk.wins}/{punk.losses}
                        </span>
                      </div>
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

                {hasPrices && (
                  <div className="mt-6 text-center font-mono-caps text-[10px] text-neutral-600">
                    <span className="text-green-400">+DLOC</span> = UNDERVALUED &middot;{" "}
                    <span className="text-red-400">-DLOC</span> = OVERVALUED
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "traits" && (
          <>
            {hasLoaded && traits.length === 0 ? (
              <div className="text-neutral-500 text-sm text-center mt-12 font-mono-caps">
                NO VOTES YET. GO VOTE!
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1.2rem_1fr_3.5rem_3rem_3rem_2.5rem] gap-x-2 items-center font-mono-caps text-[10px] text-neutral-500 mb-2 pl-2 pr-0">
                  <span>#</span>
                  <span>TRAIT</span>
                  <span className="text-right">AVG ELO</span>
                  <span className="text-right">PUNKS</span>
                  <span className="text-right">WIN</span>
                  <span className="text-right">W/L</span>
                </div>

                <div className="flex flex-col gap-1" style={{ minHeight: 400 }}>
                  {traits.map((trait, i) => (
                    <div
                      key={trait.trait}
                      className="relative grid grid-cols-[1.2rem_1fr_3.5rem_3rem_3rem_2.5rem] gap-x-2 items-center pl-2 pr-0 py-2 rounded-lg overflow-hidden"
                    >
                      <EloBar elo={trait.avg_elo} min={traitEloMin} max={traitEloMax} />
                      <span className="relative font-mono-caps text-[10px] text-neutral-600">
                        {i + 1}
                      </span>
                      <span className="relative font-mono-caps text-[10px] font-bold text-neutral-300 truncate">
                        {trait.trait}
                      </span>
                      <span className="relative font-mono-caps text-[10px] font-bold text-green-400 text-right">
                        {Math.round(trait.avg_elo)}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                        {trait.punk_count}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-400 text-right">
                        {winRate(trait.total_wins, trait.total_losses)}
                      </span>
                      <span className="relative font-mono-caps text-[10px] text-neutral-500 text-right">
                        {trait.total_wins}/{trait.total_losses}
                      </span>
                    </div>
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
