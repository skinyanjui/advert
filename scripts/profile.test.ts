import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  acceptAvatarUrlUpdate,
  cityError,
  countryCodeError,
  displayNameError,
  memberSinceYear,
  normalizeProfileUpdate,
  ownedAvatarPath,
} from "../src/lib/profile"

const migration = readFileSync(
  new URL("../supabase/migrations/20260928_profile_settings.sql", import.meta.url),
  "utf8",
)

test("profile migration adds columns and keeps profiles service-role-only", () => {
  assert.match(migration, /add column if not exists avatar_url/i)
  assert.match(migration, /add column if not exists city/i)
  assert.match(migration, /add column if not exists country_code/i)
  assert.match(migration, /values \(\s*'avatars'/i)
  assert.match(migration, /revoke all on table public\.board_profiles from anon, authenticated/i)
  assert.doesNotMatch(migration, /grant select, insert, update, delete on public\.board_profiles/i)
  assert.doesNotMatch(migration, /create policy "Owners manage profile"/i)
  assert.doesNotMatch(migration, /create policy "Avatar public read"/i)
  assert.match(migration, /drop policy if exists "Avatar public read"/i)
  assert.match(migration, /Avatar owner insert/i)
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

test("avatar URL updates reject arbitrary external links", () => {
  const owner = "11111111-1111-4111-8111-111111111111"
  const current = `https://example.supabase.co/storage/v1/object/public/avatars/${owner}/22222222-2222-4222-8222-222222222222.jpg`
  assert.equal(ownedAvatarPath(current, owner)?.startsWith(`${owner}/`), true)

  assert.equal(acceptAvatarUrlUpdate(undefined, current, owner).ok, true)
  assert.equal(acceptAvatarUrlUpdate(null, current, owner).ok, true)
  assert.equal(acceptAvatarUrlUpdate("data:image/jpeg;base64,abc", current, owner).ok, true)
  assert.equal(acceptAvatarUrlUpdate(current, current, owner).ok, true)

  const rejected = acceptAvatarUrlUpdate("https://evil.example/photo.jpg", current, owner)
  assert.equal(rejected.ok, false)
  const foreign = acceptAvatarUrlUpdate(
    `https://example.supabase.co/storage/v1/object/public/avatars/33333333-3333-4333-8333-333333333333/22222222-2222-4222-8222-222222222222.jpg`,
    current,
    owner,
  )
  assert.equal(foreign.ok, false)
})

test("package.json test script has no conflict markers and includes profile tests", () => {
  const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8")
  assert.doesNotMatch(pkg, /<<<<<<|>>>>>>|======/)
  assert.match(pkg, /scripts\/relative-time\.test\.ts/)
  assert.match(pkg, /scripts\/scroll-fades\.test\.ts/)
  assert.match(pkg, /scripts\/listing-status\.test\.ts/)
  assert.match(pkg, /scripts\/profile\.test\.ts/)
})

test("account page reuses #17 nav shared components", () => {
  const page = readFileSync(new URL("../src/components/account-page.tsx", import.meta.url), "utf8")
  assert.match(page, /from "@\/components\/empty-panel"/)
  assert.match(page, /from "@\/components\/nav-badge"/)
  assert.match(page, /from "@\/hooks\/use-nav-counts"/)
  assert.match(page, /from "@\/lib\/nav"/)
  assert.match(page, /navItem\("messages"\)/)
  assert.match(page, /navItem\("post"\)/)
  assert.doesNotMatch(page, /createBrowserSupabase/)
  assert.doesNotMatch(page, /<<<<<<|>>>>>>|======/)
})
