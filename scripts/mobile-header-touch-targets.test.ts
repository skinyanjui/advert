import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("mobile discovery header keeps search and categories touch-safe", () => {
  const css = source("src/app/globals.css")
  const header = source("src/components/site-header.tsx")
  const categories = source("src/components/category-top-nav.tsx")

  assert.match(header, /<TopNavSearch/)
  assert.match(categories, /aria-label="Browse categories"/)
  assert.match(css, /header\.sticky input[\s\S]*min-height: 44px;[\s\S]*font-size: 16px;/)
  assert.match(css, /header\.sticky \[data-sidebar="trigger"\][\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/)
})
