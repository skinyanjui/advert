import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const migration = readFileSync(
  new URL("../database/migrations/20260926_lock_listings_reads.sql", import.meta.url),
  "utf8",
)

test("lock migration drops public listing select and revokes client grants", () => {
  assert.match(migration, /drop policy if exists "Public can read listings"/i)
  assert.match(migration, /revoke all on table public\.board_listings from anon, authenticated/i)
  assert.match(migration, /revoke all on table public\.board_conversations from anon, authenticated/i)
  assert.match(migration, /revoke all on table public\.board_reports from anon, authenticated/i)
  assert.doesNotMatch(migration, /grant select on public\.board_listings/i)
  assert.doesNotMatch(migration, /using \(true\)/)
})
