import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("development listings use the operational message flow without fictional external contact", () => {
  const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")
  const store = readFileSync(new URL("../src/lib/board-store.ts", import.meta.url), "utf8")

  assert.match(detail, /const contactOpen = status === "active" && !ad\.mine/)
  assert.match(detail, /!isSample && ad\.contactWhatsApp !== false/)
  assert.match(detail, /!isSample && ad\.contactPhone !== false/)
  assert.doesNotMatch(detail, /isSample \? \(\s*<>\s*<Button[^>]*disabled[^>]*>\s*Message seller/)
  assert.match(store, /const developmentSellerId = "00000000-0000-4000-8000-000000000001"/)
  assert.match(store, /if \(seedIds\.has\(listingId\)\)/)
  assert.match(store, /return appendMessage\(viewerId, conversation, body\.trim\(\)\)/)
  assert.doesNotMatch(store, /Sample listings cannot receive messages/)
  assert.match(detail, /id="listing-message-composer"/)
  assert.match(detail, /This conversation stays attached to this listing\./)
  assert.doesNotMatch(detail, /<Dialog open=\{messageOpen && contactOpen\}/)
})
