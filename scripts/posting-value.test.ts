import assert from "node:assert/strict"
import { test } from "node:test"

import { findSubcategory } from "../src/lib/posting"
import { descriptionGuidance, suggestListingTitle } from "../src/lib/posting-value"

test("posting title suggestions turn structured answers into buyer-facing titles", () => {
  const car = findSubcategory("vehicles", "cars")
  assert.ok(car)
  assert.equal(
    suggestListingTitle({
      category: "vehicles",
      subcategory: car,
      details: { year: "2019", fuel: "Diesel", transmission: "Automatic" },
      city: "Nairobi",
    }),
    "2019 Car · Diesel · Automatic · Nairobi",
  )

  const rent = findSubcategory("property", "rent")
  assert.ok(rent)
  assert.equal(
    suggestListingTitle({
      category: "property",
      subcategory: rent,
      details: { bedrooms: "2 bed", furnished: "Furnished" },
      city: "Kigali",
    }),
    "2 bed House for rent · Furnished · Kigali",
  )
})

test("posting guidance is category-specific and concise", () => {
  const job = findSubcategory("jobs", "full-time")
  assert.ok(job)
  const guidance = descriptionGuidance("jobs", job)
  assert.equal(guidance.length, 4)
  assert.match(guidance.join(" "), /responsibilities/i)
  assert.match(guidance.join(" "), /apply/i)
})
