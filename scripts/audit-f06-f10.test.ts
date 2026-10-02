import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("browse inventory is server filtered, bounded, cursor paginated, and indexed", () => {
  const browse = readFileSync(new URL("../src/app/api/browse/route.ts", import.meta.url), "utf8")
  const search = readFileSync(new URL("../src/lib/board-search.ts", import.meta.url), "utf8")
  const migration = readFileSync(new URL("../database/migrations/20261002_browse_search_contact_reveal.sql", import.meta.url), "utf8")
  const board = readFileSync(new URL("../src/app/api/board/route.ts", import.meta.url), "utf8")
  const inventory = readFileSync(new URL("../src/lib/board-inventory.ts", import.meta.url), "utf8")

  assert.match(browse, /searchBoard/)
  assert.match(search, /Math\.min\(50/)
  assert.match(search, /nextCursor/)
  assert.match(search, /phone: ""/)
  assert.match(migration, /search_board_listings/)
  assert.match(migration, /using gin \(browse_search\)/i)
  assert.match(migration, /posted_at desc, id desc/i)
  assert.match(board, /phone: ""/)
  assert.match(inventory, /explicitly saved ads/)
  assert.doesNotMatch(inventory, /potentially public other ads/)
})

test("support intake works without an account and persists to a protected operator queue", () => {
  const route = readFileSync(new URL("../src/app/api/support/route.ts", import.meta.url), "utf8")
  const migration = readFileSync(new URL("../database/migrations/20261002_support_requests.sql", import.meta.url), "utf8")
  const page = readFileSync(new URL("../src/app/contact/page.tsx", import.meta.url), "utf8")

  assert.match(route, /support_requests/)
  assert.match(route, /Too many support requests/)
  assert.doesNotMatch(route, /resolveOwner/)
  assert.match(migration, /enable row level security/i)
  assert.match(migration, /revoke all on table public\.support_requests from anon, authenticated/i)
  assert.match(page, /SupportRequestForm/)
  assert.doesNotMatch(page, /Support email is being configured/)
})
