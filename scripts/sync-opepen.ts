import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.env.DATA_DIR || process.cwd(), "punkcomp.db");
const API_BASE = "https://api.opepen.art/v1/opepen";
const BATCH_SIZE = 50;
const DELAY_MS = 500; // Rate limit: 100 requests per second max

interface OpepenV1Response {
  token_id: string;
  set_id: number | null;
  image: {
    uuid: string;
    type: string;
  } | null;
  metadata: {
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  } | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOpepen(id: number): Promise<OpepenV1Response | null> {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getAttr(attrs: Array<{ trait_type: string; value: string | number }>, type: string): string | null {
  const attr = attrs.find((a) => a.trait_type?.toLowerCase() === type.toLowerCase());
  return attr?.value?.toString() || null;
}

async function syncBatch(db: Database.Database, startId: number, endId: number) {
  const update = db.prepare(`
    UPDATE opepen SET
      set_id = ?,
      set_name = ?,
      artist = ?,
      image_group = ?,
      edition_size = ?,
      image_url = ?
    WHERE id = ?
  `);

  const ids: number[] = [];
  for (let i = startId; i <= endId; i++) {
    ids.push(i);
  }

  // Fetch in parallel batches
  const results = await Promise.all(ids.map((id) => fetchOpepen(id)));

  const transaction = db.transaction(() => {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const data = results[i];
      if (!data) continue;

      const attrs = data.metadata?.attributes || [];
      const setName = getAttr(attrs, "Set");
      const artist = getAttr(attrs, "Artist");
      const editionStr = getAttr(attrs, "Edition Size");
      const imageGroup = data.image?.uuid || null;

      // Parse edition size
      let editionSize = 1;
      if (editionStr) {
        const editionMap: Record<string, number> = {
          one: 1,
          four: 4,
          five: 5,
          ten: 10,
          twenty: 20,
          forty: 40,
        };
        editionSize = editionMap[editionStr.toLowerCase()] || parseInt(editionStr) || 1;
      }

      // Build image URL from image data
      let imageUrl: string | null = null;
      if (data.image?.uuid && data.image?.type) {
        imageUrl = `https://opepenai.nyc3.digitaloceanspaces.com/images/${data.image.uuid}/sm.${data.image.type}`;
      }

      update.run(
        data.set_id,
        setName,
        artist,
        imageGroup,
        editionSize,
        imageUrl,
        id
      );
    }
  });

  transaction();
  return ids.length;
}

async function main() {
  console.log("Opening database:", DB_PATH);
  const db = new Database(DB_PATH);

  // Check how many opepen need syncing
  const unsynced = db.prepare(
    "SELECT COUNT(*) as c FROM opepen WHERE set_id IS NULL"
  ).get() as { c: number };

  console.log(`Opepen needing sync: ${unsynced.c} / 16000`);

  if (unsynced.c === 0) {
    console.log("All opepen already synced!");
    db.close();
    return;
  }

  // Get IDs that need syncing
  const needSync = db.prepare(
    "SELECT id FROM opepen WHERE set_id IS NULL ORDER BY id LIMIT 1000"
  ).all() as { id: number }[];

  console.log(`Syncing ${needSync.length} opepen...`);

  let synced = 0;
  for (let i = 0; i < needSync.length; i += BATCH_SIZE) {
    const batchIds = needSync.slice(i, i + BATCH_SIZE);
    const startId = batchIds[0].id;
    const endId = batchIds[batchIds.length - 1].id;

    await syncBatch(db, startId, endId);
    synced += batchIds.length;

    console.log(`Synced ${synced}/${needSync.length} (IDs ${startId}-${endId})`);

    // Rate limit
    if (i + BATCH_SIZE < needSync.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("Done!");
  db.close();
}

main().catch(console.error);
