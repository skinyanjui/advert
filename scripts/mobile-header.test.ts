import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8")
const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8")

test("mobile header delegates primary navigation to the bottom bar", () => {
  assert.match(css, /header\.sticky > div\.grid > div:nth-child\(3\)/)
  assert.match(css, /header\.sticky > div\.grid > div\.fixed/)
  assert.match(css, /grid-template-columns: auto minmax\(0, 1fr\)/)
})

test("mobile header keeps brand search and categories discovery controls", () => {
  assert.match(header, /<TopNavBrand \/>/)
  assert.match(header, /<TopNavDiscovery/)
  assert.match(header, /<TopNavSearch/)
  assert.match(header, /<TopNavCategories \/>/)
})
