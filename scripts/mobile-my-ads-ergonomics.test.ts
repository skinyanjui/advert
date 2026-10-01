import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("My Ads primary management controls are touch-safe on mobile", () => {
  const page = source("src/components/my-ads-page.tsx")

  assert.match(page, /h-11 rounded-lg px-3 text-xs md:h-8/)
  assert.match(page, /min-h-11 shrink-0 rounded-full px-3 py-2/)
  assert.match(page, /focus-visible:ring-2/)
  assert.match(page, /className="h-11 md:h-8"/)
  assert.match(page, /size-11 shrink-0 self-center/)
})

test("shared dropdown actions are touch-safe on mobile without inflating desktop density", () => {
  const menu = source("src/components/ui/dropdown-menu.tsx")

  assert.match(menu, /min-h-11/)
  assert.match(menu, /md:min-h-0/)
  assert.match(menu, /px-2 py-2/)
  assert.match(menu, /md:px-1\.5 md:py-1/)
})
