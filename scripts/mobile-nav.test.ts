import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const nav = readFileSync(new URL("../src/components/mobile-bottom-nav.tsx", import.meta.url), "utf8")
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8")
const globals = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8")

test("mobile navigation uses five persistent marketplace destinations", () => {
  assert.match(nav, /\["home", "saved", "post", "messages", "profile"\]/)
  assert.match(nav, /grid-cols-5/)
  assert.match(nav, /safe-area-inset-bottom/)
  assert.match(nav, /<NavBadge count=\{count\}/)
  assert.match(nav, /aria-current=\{active \? "page"/)
  assert.match(nav, /<PostLink/)
})

test("mobile nav is mounted once and replaces the legacy floating header dock", () => {
  assert.match(layout, /<MobileBottomNav \/>/)
  assert.match(layout, /pb-\[calc\(env\(safe-area-inset-bottom\)\+4rem\)\]/)
  assert.match(globals, /persistent mobile tab bar owns primary navigation/i)
  assert.match(globals, /header\.sticky > div\.grid > div\.fixed/)
})
