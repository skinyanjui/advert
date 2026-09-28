import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  effectiveListingStatus,
  isListingStatus,
  isPubliclyVisibleListing,
  listingNeedsMyAdsAttention,
  listingStatusLabel,
} from "../src/lib/listing-status"

test("isListingStatus accepts the four lifecycle values", () => {
  assert.equal(isListingStatus("active"), true)
  assert.equal(isListingStatus("paused"), true)
  assert.equal(isListingStatus("sold"), true)
  assert.equal(isListingStatus("expired"), true)
  assert.equal(isListingStatus("draft"), false)
  assert.equal(isListingStatus(null), false)
})

test("effectiveListingStatus prefers sold, then expiry, then paused", () => {
  const now = Date.parse("2026-09-28T12:00:00.000Z")
  assert.equal(effectiveListingStatus({ status: "sold", expiresAt: "2026-09-01T00:00:00.000Z" }, now), "sold")
  assert.equal(effectiveListingStatus({ status: "active", expiresAt: "2026-09-01T00:00:00.000Z" }, now), "expired")
  assert.equal(effectiveListingStatus({ status: "paused", expiresAt: "2026-10-01T00:00:00.000Z" }, now), "paused")
  assert.equal(effectiveListingStatus({ status: "active", expiresAt: "2026-10-01T00:00:00.000Z" }, now), "active")
  assert.equal(effectiveListingStatus({ sold: true }, now), "sold")
})

test("isPubliclyVisibleListing hides paused sold expired and moderated", () => {
  const now = Date.parse("2026-09-28T12:00:00.000Z")
  assert.equal(
    isPubliclyVisibleListing({ status: "active", expiresAt: "2026-10-01T00:00:00.000Z" }, now),
    true,
  )
  assert.equal(
    isPubliclyVisibleListing({ status: "paused", expiresAt: "2026-10-01T00:00:00.000Z" }, now),
    false,
  )
  assert.equal(
    isPubliclyVisibleListing({ status: "sold", expiresAt: "2026-10-01T00:00:00.000Z" }, now),
    false,
  )
  assert.equal(
    isPubliclyVisibleListing({ status: "active", expiresAt: "2026-09-01T00:00:00.000Z" }, now),
    false,
  )
  assert.equal(
    isPubliclyVisibleListing({ status: "active", expiresAt: "2026-10-01T00:00:00.000Z", hidden: true }, now),
    false,
  )
})

test("listingStatusLabel covers every status", () => {
  assert.equal(listingStatusLabel("active"), "Active")
  assert.equal(listingStatusLabel("paused"), "Paused")
  assert.equal(listingStatusLabel("sold"), "Sold")
  assert.equal(listingStatusLabel("expired"), "Expired")
})

test("listingNeedsMyAdsAttention only counts active expiring soon or expired-while-active", () => {
  const now = Date.parse("2026-09-28T12:00:00.000Z")
  // Active, expiring within 3 days
  assert.equal(
    listingNeedsMyAdsAttention({ status: "active", expiresAt: "2026-09-30T00:00:00.000Z" }, now),
    true,
  )
  // Active, already past expiry (expired while active)
  assert.equal(
    listingNeedsMyAdsAttention({ status: "active", expiresAt: "2026-09-01T00:00:00.000Z" }, now),
    true,
  )
  // Stored expired status
  assert.equal(
    listingNeedsMyAdsAttention({ status: "expired", expiresAt: "2026-09-01T00:00:00.000Z" }, now),
    true,
  )
  // Active but plenty of time left
  assert.equal(
    listingNeedsMyAdsAttention({ status: "active", expiresAt: "2026-11-01T00:00:00.000Z" }, now),
    false,
  )
  // Sold — never, even if past expiry
  assert.equal(
    listingNeedsMyAdsAttention({ status: "sold", expiresAt: "2026-09-01T00:00:00.000Z" }, now),
    false,
  )
  assert.equal(
    listingNeedsMyAdsAttention({ sold: true, expiresAt: "2026-09-30T00:00:00.000Z" }, now),
    false,
  )
  // Paused — never, even if past expiry or within notice window
  assert.equal(
    listingNeedsMyAdsAttention({ status: "paused", expiresAt: "2026-09-01T00:00:00.000Z" }, now),
    false,
  )
  assert.equal(
    listingNeedsMyAdsAttention({ status: "paused", expiresAt: "2026-09-30T00:00:00.000Z" }, now),
    false,
  )
})

test("listing status migration adds status sold_at and owner index without public grants", () => {
  const migration = readFileSync(
    new URL("../database/migrations/20260928_listing_status.sql", import.meta.url),
    "utf8",
  )
  assert.match(migration, /add column if not exists status text/i)
  assert.match(migration, /add column if not exists sold_at timestamptz/i)
  assert.match(migration, /check \(status in \('active', 'paused', 'sold', 'expired'\)\)/i)
  assert.match(migration, /board_listings_owner_status/i)
  assert.match(migration, /revoke all on table public\.board_listings from anon, authenticated/i)
  assert.doesNotMatch(migration, /grant select on (table )?public\.board_listings/i)
  assert.doesNotMatch(migration, /create policy .*board_listings.*using \(true\)/i)
  assert.doesNotMatch(migration, /exception\s+when others then null/i)
  assert.match(migration, /alter column status set not null/i)
})
