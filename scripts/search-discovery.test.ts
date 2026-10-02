import assert from "node:assert/strict"
import { test } from "node:test"

import { isSampleListing, seedListings } from "../src/lib/catalog"
import { canonicalOrigin, isIndexableListing, listingMetadata, listingSitemapEntries, listingSitemapIds, listingSitemapSize, readSitemapRows } from "../src/lib/search-discovery"

test("canonical links prefer the configured public origin over deployment aliases", () => {
  assert.equal(canonicalOrigin({ APP_BASE_URL: "https://classifieds.example/", VERCEL_PROJECT_PRODUCTION_URL: "old.vercel.app" }), "https://classifieds.example")
  assert.equal(canonicalOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "market.vercel.app" }), "https://market.vercel.app")
  assert.equal(canonicalOrigin({ APP_BASE_URL: "http://localhost:3000" }), "http://localhost:3000")
  assert.throws(() => canonicalOrigin({ APP_BASE_URL: "http://market.example" }))
  assert.throws(() => canonicalOrigin({ APP_BASE_URL: "https://user:password@market.example" }))
  assert.throws(() => canonicalOrigin({ APP_BASE_URL: "javascript:alert(1)" }))
})

test("sitemaps include only real, active, visible, unexpired inventory", () => {
  const now = Date.parse("2026-10-02T12:00:00Z")
  const active = { id: "ad-real", status: "active", expires_at: "2026-10-03T12:00:00Z" }
  assert.equal(isIndexableListing(active, now), true)
  assert.equal(isIndexableListing({ ...active, expires_at: null }, now), true)
  const excluded = [
    ...seedListings.map((sample) => ({ ...active, id: sample.id })),
    ...["paused", "sold", "expired", "invalid"].map((status) => ({ ...active, status })),
    { ...active, sold: true },
    { ...active, hidden_at: "2026-10-01T00:00:00Z" },
    { ...active, expires_at: "2026-10-02T12:00:00Z" },
    { ...active, expires_at: "invalid" },
    { ...active, expires_at: null, expiresAt: "2026-10-01T00:00:00Z" },
    { ...active, id: "../account" },
  ]
  for (const row of excluded) assert.equal(isIndexableListing(row, now), false, JSON.stringify(row))
  assert.deepEqual(listingSitemapEntries([...excluded, active], "https://market.example", now), [{ url: "https://market.example/listings/ad-real" }])
})

test("sample metadata is noindex while real ads retain canonical and social previews", () => {
  for (const sample of seedListings) {
    assert.equal(isSampleListing(sample.id), true)
    assert.deepEqual(listingMetadata(sample).robots, { index: false, follow: true })
    assert.match(String(listingMetadata(sample).description), /^Sample ad\. Contact unavailable\./)
  }
  const listing = { ...seedListings[0], id: "ad-real" }
  const metadata = listingMetadata(listing)
  assert.equal(isSampleListing(listing.id), false)
  assert.equal(metadata.robots, undefined)
  assert.equal(metadata.alternates?.canonical, "/listings/ad-real")
  assert.equal(metadata.openGraph?.title, listing.title)
  assert.ok(metadata.twitter)
  assert.deepEqual(listingMetadata({ ...listing, hidden: true }).robots, { index: false, follow: false })
  assert.deepEqual(listingMetadata({ ...listing, status: "sold" }).robots, { index: false, follow: false })
  assert.deepEqual(listingMetadata(undefined).robots, { index: false, follow: false })
})

test("sitemap pagination survives database response caps and preserves shard boundaries", async () => {
  const inventory = Array.from({ length: 1_234 }, (_, id) => id)
  const cappedLoad = async (from: number, to: number) => inventory.slice(from, Math.min(from + 37, to + 1))
  assert.deepEqual(await readSitemapRows(cappedLoad, 0, listingSitemapSize), inventory)
  assert.deepEqual(await readSitemapRows(cappedLoad, 500, 300), inventory.slice(500, 800))
  assert.deepEqual(await readSitemapRows(cappedLoad, 2_000, 300), [])
  assert.deepEqual(listingSitemapIds(0), [{ id: 0 }])
  assert.deepEqual(listingSitemapIds(10_000), [{ id: 0 }])
  assert.deepEqual(listingSitemapIds(10_001), [{ id: 0 }, { id: 1 }])
  assert.equal(listingSitemapIds(100_001).length, 11)
})
