import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("development listings use the operational message flow without fictional external contact", () => {
  const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")
  const store = readFileSync(new URL("../src/lib/board-store.ts", import.meta.url), "utf8")

  assert.match(detail, /listingContactCapabilities\(/)
  assert.match(detail, /sample: isSample/)
  assert.match(detail, /whatsappEnabled: ad\.contactWhatsApp !== false/)
  assert.match(detail, /phoneEnabled: ad\.contactPhone !== false/)
  assert.doesNotMatch(detail, /isSample \? \(\s*<>\s*<Button[^>]*disabled/)
  assert.match(store, /const developmentSellerId = "00000000-0000-4000-8000-000000000001"/)
  assert.match(store, /if \(seedIds\.has\(listingId\)\)/)
  assert.match(store, /return appendMessage\(viewerId, conversation, body\.trim\(\)\)/)
  assert.doesNotMatch(store, /Sample listings cannot receive messages/)
  assert.match(detail, /id="listing-message-composer"/)
  assert.match(detail, /t\("listing\.messageThreadHint"\)/)
  assert.doesNotMatch(detail, /<Dialog open=\{messageOpen && contactOpen\}/)
  assert.match(detail, /smsHref\(listing\.phone, listing\.title\)/)
  assert.match(detail, /t\("listing\.text"\)/)
  assert.match(detail, /ariaLabel=\{t\("listing\.whatsapp"\)\}/)
  assert.doesNotMatch(detail, />Listing ID \{listing\.id\}</)
})
