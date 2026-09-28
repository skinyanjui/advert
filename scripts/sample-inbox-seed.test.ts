import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const seed = readFileSync(new URL("../database/seeds/sample-inbox.sql", import.meta.url), "utf8")
const remove = readFileSync(new URL("../database/seeds/sample-inbox-remove.sql", import.meta.url), "utf8")

test("sample inbox seed is manual and marked for cleanup", () => {
  assert.match(seed, /NOT a migration/i)
  assert.match(seed, /SAMPLE ·/)
  assert.match(seed, /\[SAMPLE_INBOX\]/)
  assert.match(seed, /ad-sample-inbox-/)
  assert.match(seed, /seller_id/)
  assert.match(seed, /board_conversations/)
  assert.match(seed, /board_conversation_messages/)
  assert.match(seed, /board_listings/)
  assert.match(seed, /Edit seller_id/)
  assert.doesNotMatch(seed, /grant (select|insert|update|all)/i)
})

test("sample inbox removal targets the same markers", () => {
  assert.match(remove, /NOT a migration/i)
  assert.match(remove, /ad-sample-inbox-/)
  assert.match(remove, /SAMPLE ·/)
  assert.match(remove, /\[SAMPLE_INBOX\]/)
  assert.match(remove, /board_conversation_messages/)
  assert.match(remove, /board_conversations/)
  assert.match(remove, /board_listings/)
})
