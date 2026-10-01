import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import cities from "../src/data/cities.json"
import { categories } from "../src/lib/category-registry"
import { contactMethods } from "../src/lib/contact-methods"
import { contactEventTypes } from "../src/lib/contact-event-types"
import { countries } from "../src/lib/countries"
import { currencyRegistry } from "../src/lib/currency-registry"
import { listingStatuses } from "../src/lib/listing-status"
import { marketplacePolicy } from "../src/lib/marketplace-policy"
import { postingPlans } from "../src/lib/posting"
import { referenceSnapshotMetadata } from "../src/lib/reference-manifest"
import { profilePatchFromUnknown, stableOptionId } from "../src/lib/runtime-contracts"

test("category registry is unique and every category has one posting plan and translation key", () => {
  assert.equal(new Set(categories.map((item) => item.id)).size, categories.length)
  const plans = postingPlans()
  assert.equal(plans.length, categories.length)
  for (const category of categories) {
    assert.ok(plans.some((plan) => plan.id === category.id), `missing posting plan: ${category.id}`)
    for (const locale of ["en", "fr", "sw"]) {
      const source = readFileSync(new URL(`../src/lib/i18n/messages/${locale}.ts`, import.meta.url), "utf8")
      assert.ok(source.includes(`"${category.labelKey}"`), `missing ${locale} translation: ${category.labelKey}`)
    }
  }
})

test("reference relations are internally consistent", () => {
  assert.equal(new Set(countries.map((item) => item.code)).size, countries.length)
  assert.equal(new Set(countries.map((item) => item.alpha3)).size, countries.length)
  const numeric = countries.map((item) => item.numeric).filter(Boolean)
  assert.equal(new Set(numeric).size, numeric.length)
  const countryCodes = new Set(countries.map((item) => item.code))
  for (const country of countries) {
    assert.match(country.code, /^[A-Z]{2}$/)
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: country.timezone }).format())
  }
  for (const city of cities) {
    assert.ok(countryCodes.has(city.country), `unknown city country: ${city.country}`)
    assert.ok(city.pop >= 15000)
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: city.tz }).format())
  }
  const currencies = currencyRegistry()
  assert.equal(new Set(currencies.map((item) => item.code)).size, currencies.length)
  for (const currency of currencies) assert.match(currency.code, /^[A-Z]{3}$/)
})

test("database lifecycle and contact constraints match code registries", () => {
  const lifecycle = readFileSync(new URL("../database/migrations/20260928_listing_status.sql", import.meta.url), "utf8")
  for (const status of listingStatuses) assert.ok(lifecycle.includes(`'${status}'`))
  const events = new Set<string>(contactEventTypes)
  for (const method of Object.values(contactMethods)) {
    assert.ok(events.has(method.analyticsEvent), `missing analytics event for ${method.id}`)
  }
})

test("marketplace policy owns stable listing and photo limits", () => {
  assert.equal(marketplacePolicy.listing.lifetimeDays, 60)
  assert.equal(marketplacePolicy.photos.maxCount, 6)
  assert.match(readFileSync(new URL("../src/lib/expiry.ts", import.meta.url), "utf8"), /marketplacePolicy\.listing/)
  assert.match(readFileSync(new URL("../src/lib/photos.ts", import.meta.url), "utf8"), /marketplacePolicy\.photos/)
})

test("reference snapshots expose provenance hashes", () => {
  for (const dataset of ["countries", "cities"] as const) {
    const meta = referenceSnapshotMetadata(dataset)
    assert.match(meta.version, /^[a-f0-9]{64}$/)
    assert.ok(meta.sourceUrl.startsWith("https://"))
    assert.ok(meta.license.length > 0)
    assert.ok(meta.recordCount > 0)
  }
})

test("runtime contracts preserve stable IDs independently from labels", () => {
  assert.equal(stableOptionId("fuel", "Electric / Hybrid"), "fuel:electric-hybrid")
  assert.deepEqual(profilePatchFromUnknown({ countryCode: "KE", city: "Nairobi", extra: 1 }), {
    countryCode: "KE",
    city: "Nairobi",
  })
})

test("listing cards do not show buyer distance; details do", () => {
  const card = readFileSync(new URL("../src/components/listing-card.tsx", import.meta.url), "utf8")
  const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(card, /distanceKm|formatDistance/)
  assert.match(detail, /distanceAway/)
  assert.match(detail, /formatDistance/)
  assert.match(detail, /locationDetail/)
})
