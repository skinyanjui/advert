import assert from "node:assert/strict"
import { test } from "node:test"

import {
  daysUntilExpiry,
  expiresAtFrom,
  isListingExpired,
  isListingExpiringSoon,
  isListingNeedingAttention,
  listingLifetimeDays,
} from "../src/lib/expiry"

test("expiresAtFrom adds 60 days", () => {
  const start = new Date("2026-01-01T00:00:00.000Z")
  const expires = new Date(expiresAtFrom(start))
  const days = (expires.getTime() - start.getTime()) / 86_400_000
  assert.equal(days, listingLifetimeDays)
})

test("isListingExpired and expiring soon windows", () => {
  const now = Date.parse("2026-09-26T12:00:00.000Z")
  assert.equal(isListingExpired("2026-09-20T00:00:00.000Z", now), true)
  assert.equal(isListingExpired("2026-10-01T00:00:00.000Z", now), false)
  assert.equal(isListingExpiringSoon("2026-09-30T00:00:00.000Z", now), true)
  assert.equal(isListingExpiringSoon("2026-11-01T00:00:00.000Z", now), false)
  assert.equal(isListingExpiringSoon("2026-09-20T00:00:00.000Z", now), false)
  assert.equal(daysUntilExpiry("2026-09-28T12:00:00.000Z", now), 2)
})

test("isListingNeedingAttention covers expired and 3-day window", () => {
  const now = Date.parse("2026-09-26T12:00:00.000Z")
  assert.equal(isListingNeedingAttention("2026-09-20T00:00:00.000Z", now), true)
  assert.equal(isListingNeedingAttention("2026-09-28T12:00:00.000Z", now), true)
  assert.equal(isListingNeedingAttention("2026-10-05T00:00:00.000Z", now), false)
})
