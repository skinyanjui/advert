import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  cityError,
  countryCodeError,
  displayNameError,
  memberSinceYear,
  normalizeProfileUpdate,
} from "../src/lib/profile"

const migration = readFileSync(
  new URL("../supabase/migrations/20260928_profile_settings.sql", import.meta.url),
  "utf8",
)

test("profile migration adds avatar and location columns plus avatars bucket", () => {
  assert.match(migration, /add column if not exists avatar_url/i)
  assert.match(migration, /add column if not exists city/i)
  assert.match(migration, /add column if not exists country_code/i)
  assert.match(migration, /values \(\s*'avatars'/i)
  assert.match(migration, /Owners manage profile/i)
  assert.match(migration, /Avatar owner insert/i)
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/)
})

test("display name and city validation", () => {
  assert.equal(displayNameError(""), "Enter a display name.")
  assert.equal(displayNameError("Ada"), undefined)
  assert.match(displayNameError("a".repeat(81) as string) ?? "", /at most 80/)
  assert.equal(cityError(""), undefined)
  assert.equal(cityError("Nairobi"), undefined)
  assert.match(cityError("x".repeat(81)) ?? "", /at most 80/)
})

test("country and normalizeProfileUpdate", () => {
  assert.equal(countryCodeError("KE"), undefined)
  assert.equal(countryCodeError("XX"), "Choose a valid country.")
  const ok = normalizeProfileUpdate({
    displayName: "  Ada  ",
    city: " Nairobi ",
    countryCode: "ke",
  })
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.deepEqual(ok.value, {
      displayName: "Ada",
      city: "Nairobi",
      countryCode: "KE",
    })
  }
  const bad = normalizeProfileUpdate({ displayName: "" })
  assert.equal(bad.ok, false)
})

test("memberSinceYear reads created_at year", () => {
  assert.equal(memberSinceYear("2026-03-01T12:00:00.000Z"), 2026)
  assert.equal(memberSinceYear(null), null)
})
