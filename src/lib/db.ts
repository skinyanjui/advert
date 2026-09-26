import fs from "fs"
import { DatabaseSync } from "node:sqlite"
import path from "path"

const globalDb = globalThis as unknown as { classifiedsDb?: DatabaseSync }

export function database(): DatabaseSync {
  if (globalDb.classifiedsDb) return globalDb.classifiedsDb
  const dir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data")
  fs.mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(path.join(dir, "classifieds.db"))
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA busy_timeout = 3000")
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      owner_token TEXT NOT NULL,
      posted_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saves (
      owner_token TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (owner_token, listing_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      owner_token TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_owner ON messages (owner_token, sent_at);
    CREATE TABLE IF NOT EXISTS place_cache (
      cache_key TEXT PRIMARY KEY,
      cached_at INTEGER NOT NULL,
      payload TEXT NOT NULL
    );
  `)
  globalDb.classifiedsDb = db
  return db
}

export function readPlaceCache(key: string, maxAgeMs: number): string | undefined {
  const row = database()
    .prepare("SELECT cached_at, payload FROM place_cache WHERE cache_key = ?")
    .get(key)
  if (!row) return undefined
  const at = typeof row.cached_at === "number" ? row.cached_at : Number(row.cached_at)
  if (!Number.isFinite(at) || Date.now() - at > maxAgeMs) return undefined
  return typeof row.payload === "string" ? row.payload : undefined
}

export function writePlaceCache(key: string, payload: string): void {
  const db = database()
  const now = Date.now()
  db.prepare(
    "INSERT INTO place_cache (cache_key, cached_at, payload) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET cached_at = excluded.cached_at, payload = excluded.payload",
  ).run(key, now, payload)
  db.prepare("DELETE FROM place_cache WHERE cached_at < ?").run(now - 10 * 60 * 1000)
}
