# PVP

**[pvp.community](https://pvp.community)**

A crowdsourced aesthetic ranking system for NFT collections. Vote on head-to-head matchups to build community-driven leaderboards.

## Collections

- **CryptoPunks** - All 10,000 punks with trait-based aggregations
- **Opepen** - 16,000 tokens across 18 sets with artist/set leaderboards

## Features

- **1v1 Voting** - Simple head-to-head comparisons
- **ELO Rankings** - Chess-style rating system tracks aesthetic consensus
- **Leaderboards** - Individual tokens, traits (punks), and sets/artists (opepen)
- **Live Ticker** - Real-time stats, top performers, recent upsets
- **Match History** - Track any token's voting history and rank
- **API** - Public endpoints for rankings, stats, and individual tokens

## Tech

- Next.js 15 (App Router)
- SQLite (better-sqlite3) with WAL mode
- Tailwind CSS

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### CryptoPunks
- `GET /api/leaderboard` - Paginated punk rankings
- `GET /api/traits` - Trait aggregations by avg ELO
- `GET /api/punk/[id]` - Individual punk stats + history
- `GET /api/ticker` - Live stats for ticker

### Opepen
- `GET /api/opepen/leaderboard` - Paginated opepen rankings
- `GET /api/opepen/sets` - Set/artist aggregations
- `GET /api/opepen/[id]` - Individual opepen stats + history
- `GET /api/opepen/ticker` - Live opepen stats

### Public API (v1)
- `GET /api/v1/rankings` - Full rankings export
- `GET /api/v1/stats` - Collection stats
- `GET /api/v1/punk/[id]` - Punk data
- `GET /api/v1/traits` - Trait data
