import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8")
const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")

test("mobile listing contact remains reachable above persistent navigation", () => {
  assert.match(css, /#listing-contact\s*\{[\s\S]*scroll-margin-bottom:/)
  assert.match(css, /#listing-message-composer\s*\{[\s\S]*scroll-margin-bottom:/)
  assert.match(detail, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.25rem\)\]/)
})

test("mobile listing contact exposes touch-sized actions and zoom-safe fields", () => {
  assert.match(css, /#listing-contact button,[\s\S]*min-height:\s*44px/)
  assert.match(css, /#listing-contact textarea,[\s\S]*font-size:\s*16px/)
})

test("listing mobile contact keeps message as primary and direct contact secondary", () => {
  assert.match(detail, /t\("listing\.messageSeller"\)/)
  assert.match(detail, /aria-label="More contact options"/)
  assert.match(detail, /setMobileContactOpen/)
})
