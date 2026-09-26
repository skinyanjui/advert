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
  `)
  globalDb.classifiedsDb = db
  return db
}
