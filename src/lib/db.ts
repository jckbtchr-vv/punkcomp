import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.env.DATA_DIR || process.cwd(), "punkcomp.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = FULL");
    db.pragma("wal_autocheckpoint = 100");
    initDb(db);

    // Graceful shutdown: checkpoint WAL and close DB
    const shutdown = () => {
      if (db) {
        try {
          db.pragma("wal_checkpoint(TRUNCATE)");
          db.close();
        } catch {}
      }
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS punks (
      id INTEGER PRIMARY KEY,
      elo REAL NOT NULL DEFAULT 1500,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      last_sale_eth REAL,
      last_sale_date TEXT,
      type TEXT,
      gender TEXT,
      skin_tone TEXT,
      accessory_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS punk_traits (
      punk_id INTEGER NOT NULL,
      trait TEXT NOT NULL,
      PRIMARY KEY (punk_id, trait)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      winner_id INTEGER NOT NULL,
      loser_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opepen (
      id INTEGER PRIMARY KEY,
      elo REAL NOT NULL DEFAULT 1500,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS opepen_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      winner_id INTEGER NOT NULL,
      loser_id INTEGER NOT NULL,
      voter_ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_cache (
      punk_id INTEGER PRIMARY KEY,
      owner_address TEXT,
      owner_ens TEXT,
      listing_price_eth REAL,
      bid_price_eth REAL,
      is_for_sale INTEGER DEFAULT 0,
      has_bid INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collectors (
      address TEXT PRIMARY KEY,
      ens_name TEXT,
      punk_ids TEXT,
      punk_count INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add columns if upgrading from older schema
  const cols = db.prepare("PRAGMA table_info(punks)").all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("last_sale_eth")) {
    db.exec("ALTER TABLE punks ADD COLUMN last_sale_eth REAL");
  }
  if (!colNames.includes("last_sale_date")) {
    db.exec("ALTER TABLE punks ADD COLUMN last_sale_date TEXT");
  }
  if (!colNames.includes("type")) {
    db.exec("ALTER TABLE punks ADD COLUMN type TEXT");
  }
  if (!colNames.includes("gender")) {
    db.exec("ALTER TABLE punks ADD COLUMN gender TEXT");
  }
  if (!colNames.includes("skin_tone")) {
    db.exec("ALTER TABLE punks ADD COLUMN skin_tone TEXT");
  }
  if (!colNames.includes("accessory_count")) {
    db.exec("ALTER TABLE punks ADD COLUMN accessory_count INTEGER");
  }

  // Add voter_ip to votes table if missing
  const voteCols = db.prepare("PRAGMA table_info(votes)").all() as { name: string }[];
  const voteColNames = voteCols.map((c) => c.name);
  if (!voteColNames.includes("voter_ip")) {
    db.exec("ALTER TABLE votes ADD COLUMN voter_ip TEXT");
  }

  // Seed all 10,000 punks if table is empty
  const count = db.prepare("SELECT COUNT(*) as c FROM punks").get() as {
    c: number;
  };
  if (count.c === 0) {
    const insert = db.prepare(
      "INSERT INTO punks (id, elo, wins, losses) VALUES (?, 1500, 0, 0)"
    );
    const seed = db.transaction(() => {
      for (let i = 0; i < 10000; i++) {
        insert.run(i);
      }
    });
    seed();
  }

  // Seed trait data if not yet loaded
  const traitCount = db.prepare("SELECT COUNT(*) as c FROM punk_traits").get() as { c: number };
  if (traitCount.c === 0) {
    seedTraits(db);
  }

  // Add image_url column to opepen if missing
  const opepenCols = db.prepare("PRAGMA table_info(opepen)").all() as { name: string }[];
  const opepenColNames = opepenCols.map((c) => c.name);
  if (!opepenColNames.includes("image_url")) {
    db.exec("ALTER TABLE opepen ADD COLUMN image_url TEXT");
  }
  if (!opepenColNames.includes("image_group")) {
    db.exec("ALTER TABLE opepen ADD COLUMN image_group TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_opepen_image_group ON opepen(image_group)");
  }
  if (!opepenColNames.includes("edition_size")) {
    db.exec("ALTER TABLE opepen ADD COLUMN edition_size INTEGER");
  }
  if (!opepenColNames.includes("set_id")) {
    db.exec("ALTER TABLE opepen ADD COLUMN set_id INTEGER");
    db.exec("CREATE INDEX IF NOT EXISTS idx_opepen_set_id ON opepen(set_id)");
  }
  if (!opepenColNames.includes("set_name")) {
    db.exec("ALTER TABLE opepen ADD COLUMN set_name TEXT");
  }
  if (!opepenColNames.includes("artist")) {
    db.exec("ALTER TABLE opepen ADD COLUMN artist TEXT");
  }
  if (!opepenColNames.includes("owner")) {
    db.exec("ALTER TABLE opepen ADD COLUMN owner TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_opepen_owner ON opepen(owner)");
  }

  // Create opepen_ens table for caching ENS names
  db.exec(`
    CREATE TABLE IF NOT EXISTS opepen_ens (
      address TEXT PRIMARY KEY,
      ens_name TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Seed 16,000 opepen if table is empty
  const opepenCount = db.prepare("SELECT COUNT(*) as c FROM opepen").get() as { c: number };
  if (opepenCount.c === 0) {
    const insertOpepen = db.prepare(
      "INSERT INTO opepen (id, elo, wins, losses) VALUES (?, 1500, 0, 0)"
    );
    const seedOpepen = db.transaction(() => {
      for (let i = 1; i <= 16000; i++) {
        insertOpepen.run(i);
      }
    });
    seedOpepen();
  }
}

function seedTraits(db: Database.Database) {
  // Try to find the CSV relative to cwd (project root)
  const csvPath = path.join(process.cwd(), "data", "cryptopunks.csv");
  if (!fs.existsSync(csvPath)) {
    console.warn(`Trait CSV not found at ${csvPath}, skipping trait seed`);
    return;
  }

  const csv = fs.readFileSync(csvPath, "utf-8");
  const lines = csv.trim().split("\n").slice(1); // skip header

  const updatePunk = db.prepare(
    "UPDATE punks SET type = ?, gender = ?, skin_tone = ?, accessory_count = ? WHERE id = ?"
  );
  const insertTrait = db.prepare(
    "INSERT OR IGNORE INTO punk_traits (punk_id, trait) VALUES (?, ?)"
  );

  const seed = db.transaction(() => {
    for (const line of lines) {
      // Format: id, type, gender, skin tone, count, accessories
      const parts = line.split(",").map((s) => s.trim());
      const id = parseInt(parts[0]);
      const type = parts[1] || null;
      const gender = parts[2] || null;
      const skinTone = parts[3] || null;
      const accessoryCount = parseInt(parts[4]) || 0;
      const accessories = parts.slice(5).join(",").trim(); // rejoin in case accessories contain commas

      updatePunk.run(type, gender, skinTone, accessoryCount, id);

      // Insert type as a trait too for aggregation
      if (type) insertTrait.run(id, type);

      // Insert individual accessories
      if (accessories) {
        for (const trait of accessories.split(" / ")) {
          const t = trait.trim();
          if (t) insertTrait.run(id, t);
        }
      }
    }
  });

  seed();
  console.log(`Seeded traits for ${lines.length} punks`);
}
