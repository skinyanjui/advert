import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("account and profile controls are touch-safe on mobile", () => {
  const page = source("src/components/account-page.tsx")
  const css = source("src/app/globals.css")

  assert.match(page, /data-mobile-form-surface/)
  assert.match(page, /<DialogContent data-mobile-form-surface>/)
  assert.match(css, /\[data-mobile-form-surface\] \[data-slot="button"\]/)
  assert.match(css, /\[data-mobile-form-surface\] \[data-slot="input"\]/)
  assert.match(css, /\[data-mobile-form-surface\] \[data-slot="select-trigger"\]/)
  assert.match(css, /min-height: 44px/)
})

test("account inputs prevent iOS focus zoom and keep focused fields above navigation", () => {
  const css = source("src/app/globals.css")

  assert.match(css, /\[data-mobile-form-surface\] \[data-slot="input"\][\s\S]*font-size: 16px/)
  assert.match(css, /scroll-margin-bottom: calc\(env\(safe-area-inset-bottom\) \+ 6rem\)/)
})
