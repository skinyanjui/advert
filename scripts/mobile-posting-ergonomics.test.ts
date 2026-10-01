import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("posting location and phone controls use mobile touch targets", () => {
  const location = source("src/components/posting/location-fields.tsx")
  const city = source("src/components/city-field.tsx")
  const phone = source("src/components/contact-phone-field.tsx")

  assert.match(location, /h-11 bg-background sm:h-10/)
  assert.match(location, /min-h-11[\s\S]*sm:min-h-0/)
  assert.match(city, /h-11 sm:h-10/)
  assert.match(city, /min-h-11[\s\S]*sm:min-h-0/)
  assert.match(phone, /h-11 bg-white sm:h-10/)
})

test("posting location suggestions expose keyboard focus treatment", () => {
  const location = source("src/components/posting/location-fields.tsx")
  const city = source("src/components/city-field.tsx")

  assert.match(location, /focus-visible:outline-2/)
  assert.match(city, /focus-visible:outline-2/)
})
