"use client";

import Link from "next/link";

function Endpoint({
  method,
  path,
  description,
  params,
  example,
}: {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
  example: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono-caps text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
          {method}
        </span>
        <code className="text-sm text-neutral-200">{path}</code>
      </div>
      <p className="text-sm text-neutral-400 mb-3">{description}</p>
      {params && params.length > 0 && (
        <div className="mb-3">
          <p className="font-mono-caps text-[10px] text-neutral-500 mb-1">PARAMETERS</p>
          <div className="bg-neutral-900/50 rounded-lg p-3">
            {params.map((p) => (
              <div key={p.name} className="flex gap-3 text-xs mb-1 last:mb-0">
                <code className="text-green-400 shrink-0">{p.name}</code>
                <span className="text-neutral-600 shrink-0">{p.type}</span>
                <span className="text-neutral-400">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="font-mono-caps text-[10px] text-neutral-500 mb-1">EXAMPLE</p>
        <pre className="bg-neutral-900/50 rounded-lg p-3 text-xs text-neutral-300 overflow-x-auto">
          {example}
        </pre>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="mb-6 text-center h-16 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          PUNKCOMP
        </h1>
        <p className="font-mono-caps text-xs text-neutral-500">API DOCS</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          &larr; VOTE
        </Link>
        <Link
          href="/leaderboard"
          className="font-mono-caps text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
        >
          LEADERBOARD
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-8 text-sm text-neutral-400 border border-neutral-800 rounded-lg p-4">
          <p className="mb-2">
            All endpoints are read-only, require no authentication, and return JSON. CORS is enabled for all origins.
          </p>
          <p>
            Base URL: <code className="text-neutral-200">https://your-domain.com/api/v1</code>
          </p>
        </div>

        <Endpoint
          method="GET"
          path="/api/v1/stats"
          description="Aggregate statistics: total votes, voters, punks rated, elo range, top and bottom punks."
          example={`{
  "data": {
    "totalVotes": 12450,
    "totalVoters": 342,
    "totalPunks": 10000,
    "punksRated": 4821,
    "elo": { "min": 1389.21, "max": 1623.45, "avg": 1500.00 },
    "topPunk": { "id": 7804, "elo": 1623.45 },
    "bottomPunk": { "id": 2890, "elo": 1389.21 },
    "mostVotedPunk": { "id": 3100, "totalMatchups": 47 }
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/rankings"
          description="Paginated punk rankings sorted by Elo descending. Includes type, skin tone, accessories count, and last sale price."
          params={[
            { name: "page", type: "int", desc: "Page number (default: 1)" },
            { name: "limit", type: "int", desc: "Results per page, max 100 (default: 50)" },
          ]}
          example={`{
  "data": [
    {
      "id": 7804,
      "rank": 1,
      "elo": 1623.45,
      "wins": 28,
      "losses": 5,
      "winRate": 84.85,
      "lastSaleEth": 4550.0,
      "type": "Alien",
      "skinTone": null,
      "accessoryCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 4821,
    "totalPages": 97
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/punk/:id"
          description="Full data for a single punk including traits, rank, and sale history. Works for all 10,000 punks (0-9999) even if unvoted."
          params={[
            { name: "id", type: "int", desc: "Punk ID (0-9999)" },
          ]}
          example={`{
  "data": {
    "id": 7804,
    "rank": 1,
    "totalRanked": 4821,
    "elo": 1623.45,
    "wins": 28,
    "losses": 5,
    "winRate": 84.85,
    "lastSaleEth": 4550.0,
    "lastSaleDate": "2024-12-05",
    "type": "Alien",
    "gender": "Male",
    "skinTone": null,
    "accessoryCount": 2,
    "traits": ["Cap Forward", "Small Shades"]
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/votes"
          description="Recent votes in reverse chronological order. Each vote records the winner and loser punk IDs."
          params={[
            { name: "limit", type: "int", desc: "Number of results, max 100 (default: 50)" },
            { name: "offset", type: "int", desc: "Skip first N results (default: 0)" },
          ]}
          example={`{
  "data": [
    {
      "id": 12450,
      "winnerId": 7804,
      "loserId": 3100,
      "createdAt": "2025-02-07T14:30:00"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 12450
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/traits"
          description="All traits ranked by average Elo of punks that have that trait. Includes win/loss totals and win rate."
          example={`{
  "data": [
    {
      "rank": 1,
      "trait": "Beanie",
      "punkCount": 44,
      "avgElo": 1528.73,
      "totalWins": 312,
      "totalLosses": 198,
      "winRate": 61.18
    }
  ],
  "total": 87
}`}
        />

        <div className="mt-8 mb-12 text-xs text-neutral-600 border-t border-neutral-800 pt-6">
          <p className="font-mono-caps text-[10px] text-neutral-500 mb-2">NOTES</p>
          <ul className="space-y-1 text-neutral-500">
            <li>Elo starts at 1500 for all punks. K-factor is 32.</li>
            <li>Win rate is expressed as a percentage (0-100).</li>
            <li>Punks with zero votes have rank: null in the /punk/:id endpoint.</li>
            <li>Price data (lastSaleEth) requires an Alchemy sync and may be null.</li>
            <li>Traits exclude the punk type (Human/Zombie/Ape/Alien) — type is a separate field.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
