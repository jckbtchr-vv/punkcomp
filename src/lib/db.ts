import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "punkcomp.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    initDb(db);
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
      last_sale_date TEXT
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
  `);

  // Add price columns if upgrading from older schema
  const cols = db.prepare("PRAGMA table_info(punks)").all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("last_sale_eth")) {
    db.exec("ALTER TABLE punks ADD COLUMN last_sale_eth REAL");
  }
  if (!colNames.includes("last_sale_date")) {
    db.exec("ALTER TABLE punks ADD COLUMN last_sale_date TEXT");
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
}
