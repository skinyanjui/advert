import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("mobile browse controls preserve 44px touch targets and iOS-safe input sizing", () => {
  const city = source("src/components/board-place.tsx")
  const card = source("src/components/listing-card.tsx")

  assert.match(city, /h-11 rounded-full[\s\S]*text-base[\s\S]*sm:h-8[\s\S]*sm:text-xs/)
  assert.match(city, /size-11[\s\S]*sm:size-8/)
  assert.match(city, /min-h-11[\s\S]*sm:min-h-0/)
  assert.match(card, /size-8[\s\S]*after:-inset-1\.5[\s\S]*sm:size-7[\s\S]*sm:after:inset-0/)
})

test("mobile browse controls expose visible keyboard focus treatment", () => {
  const city = source("src/components/board-place.tsx")
  const card = source("src/components/listing-card.tsx")

  assert.match(city, /focus-visible:outline-2/)
  assert.match(card, /focus-visible:outline-2/)
})
