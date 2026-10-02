import assert from "node:assert/strict"
import { test } from "node:test"

import { formatMoney } from "../src/lib/format"
import { type FxRates } from "../src/lib/fx"
import { listingPriceDisplay } from "../src/lib/price-display"
import { locationHref } from "../src/lib/use-listing-query"

const rates: FxRates = { base: "USD", rates: { KES: 100, UGX: 3700, RWF: 1400 }, fetchedAt: "2026-10-02" }
const listing = Object.freeze({ price: 100, currency: "KES", country: "KE", priceSuffix: "/ month" })

test("the buyer's selected market controls one browsing price", () => {
  const display = listingPriceDisplay(listing, { currency: "listing", marketCountry: "UG", rates })
  assert.equal(display.primary, `≈ ${formatMoney(3700, "UGX")} / month`)
  assert.equal(display.currency, "UGX")
  assert.equal(display.approximate, true)
  assert.equal(display.conversionUnavailable, false)
  assert.equal("secondary" in display, false)
  assert.deepEqual(listing, { price: 100, currency: "KES", country: "KE", priceSuffix: "/ month" })
})

test("an explicit African currency overrides the buyer market", () => {
  const display = listingPriceDisplay(listing, { currency: "RWF", marketCountry: "UG", rates })
  assert.equal(display.currency, "RWF")
  assert.equal(display.primary, `≈ ${formatMoney(1400, "RWF")} / month`)
})

test("with no buyer market, a seller country does not invent a display currency", () => {
  const foreignCurrencyListing = { ...listing, currency: "USD" }
  for (const marketCountry of [undefined, "XX"]) {
    const display = listingPriceDisplay(foreignCurrencyListing, { currency: "listing", marketCountry, rates })
    assert.equal(display.primary, "$100 / month")
    assert.equal(display.currency, "USD")
    assert.equal(display.approximate, false)
    assert.equal(display.conversionUnavailable, false)
  }
})

test("authoring and conversation prices retain the chosen listing currency", () => {
  for (const currency of ["listing", "RWF"]) {
    const display = listingPriceDisplay(listing, { currency, marketCountry: "UG", rates, mode: "posted" })
    assert.equal(display.primary, `${formatMoney(100, "KES")} / month`)
    assert.equal(display.currency, "KES")
    assert.equal(display.approximate, false)
    assert.equal(display.conversionUnavailable, false)
  }
})

test("same-currency browsing works without exchange rates", () => {
  const display = listingPriceDisplay(listing, { currency: "listing", marketCountry: "KE" })
  assert.equal(display.primary, `${formatMoney(100, "KES")} / month`)
  assert.equal(display.approximate, false)
  assert.equal(display.conversionUnavailable, false)
})

test("unavailable or invalid rates fall back to the posted price and suffix", () => {
  for (const fx of [null, { ...rates, rates: {} }, ...[0, -1, NaN, Infinity].map((UGX) => ({ ...rates, rates: { KES: 100, UGX } }))]) {
    const display = listingPriceDisplay(listing, { currency: "listing", marketCountry: "UG", rates: fx })
    assert.equal(display.primary, `${formatMoney(100, "KES")} / month`)
    assert.equal(display.approximate, false)
    assert.equal(display.conversionUnavailable, true)
    assert.equal(display.currency, "KES")
  }
})

test("market and posted prices use the viewer's number-formatting locale", () => {
  const input = { currency: "listing", marketCountry: "UG", rates, locale: "fr" as const }
  assert.equal(listingPriceDisplay(listing, input).primary, `≈ ${formatMoney(3700, "UGX", "fr")} / month`)
  assert.equal(listingPriceDisplay(listing, { ...input, mode: "posted" }).primary, `${formatMoney(100, "KES", "fr")} / month`)
})

test("changing the market preserves the category, search, type and sort", () => {
  const href = locationHref("/vehicles", "country=KE&city=Nairobi&q=toyota&type=cars&sort=newest&page=3&view=map", "UG")
  const result = new URL(href, "https://example.test")
  assert.equal(result.pathname, "/vehicles")
  assert.equal(result.searchParams.get("country"), "UG")
  assert.equal(result.searchParams.get("q"), "toyota")
  assert.equal(result.searchParams.get("type"), "cars")
  assert.equal(result.searchParams.get("sort"), "newest")
  for (const key of ["city", "page", "view"]) assert.equal(result.searchParams.has(key), false)
  assert.equal(locationHref("/vehicles", "country=KE&city=Nairobi&type=cars", null), "/vehicles?type=cars")
})

test("a market change from an account/detail route opens valid board filters", () => {
  assert.equal(locationHref("/listings/example", "type=cars&sort=invalid", "uganda", "Kampala"), "/?country=UG&city=Kampala")
})
