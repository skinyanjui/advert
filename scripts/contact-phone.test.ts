import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  contactPhoneError,
  contactPhonePlaceholder,
  normalizeContactPhone,
  prefillListingPhone,
} from "../src/lib/contact-phone"
import { normalizeProfileUpdate } from "../src/lib/profile"

test("contact phone validation matches listing digit rules", () => {
  assert.equal(contactPhoneError("", { required: true }), "Add a phone number people can use.")
  assert.equal(contactPhoneError(""), undefined)
  assert.equal(contactPhoneError("123"), "Add a phone number people can use.")
  assert.equal(contactPhoneError("+254712345678"), undefined)
  assert.equal(normalizeContactPhone("0712 345 678", "KE"), "+254712345678")
  assert.equal(normalizeContactPhone("00254712345678", "KE"), "+254712345678")
  assert.equal(contactPhoneError("1".repeat(16)), "Use a shorter phone number.")
  assert.equal(normalizeContactPhone("  +254 712 345 678  "), "+254712345678")
})

test("contact phone placeholder never invents a KE default", () => {
  assert.equal(contactPhonePlaceholder(null), "+… 7XX XXX XXX")
  assert.equal(contactPhonePlaceholder(undefined), "+… 7XX XXX XXX")
  assert.equal(contactPhonePlaceholder("+254"), "+254 7XX XXX XXX")
  assert.doesNotMatch(contactPhonePlaceholder(null), /\+254/)
})

test("prefillListingPhone uses profile only for new ads", () => {
  assert.equal(prefillListingPhone(undefined, "+254700000000"), "+254700000000")
  assert.equal(prefillListingPhone("", "+254700000000"), "+254700000000")
  assert.equal(prefillListingPhone("+254711111111", "+254700000000"), "+254711111111")
  assert.equal(prefillListingPhone("+254711111111", null), "+254711111111")
  assert.equal(prefillListingPhone(undefined, null), "")
})

test("normalizeProfileUpdate accepts optional phone", () => {
  const ok = normalizeProfileUpdate({ phone: " +254712345678 " })
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.value.phone, "+254712345678")
  const clear = normalizeProfileUpdate({ phone: null })
  assert.equal(clear.ok, true)
  if (clear.ok) assert.equal(clear.value.phone, null)
  const bad = normalizeProfileUpdate({ phone: "12" })
  assert.equal(bad.ok, false)
})

test("buyer contact migration is service-role-only with phone checks", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260928_profile_buyer_contact.sql", import.meta.url),
    "utf8",
  )
  assert.match(migration, /add column if not exists phone/i)
  assert.match(migration, /board_profiles_phone_len/)
  assert.match(migration, /board_profiles_phone_digits/)
  assert.match(migration, /revoke all on table public\.board_profiles from anon, authenticated/i)
  assert.doesNotMatch(migration, /grant select, insert, update, delete on public\.board_profiles/i)
  assert.doesNotMatch(migration, /create policy/i)
})

test("public seller overlay select never includes phone", () => {
  const store = readFileSync(new URL("../src/lib/profile-store.ts", import.meta.url), "utf8")
  assert.match(store, /\.select\("user_id,display_name,avatar_url,created_at"\)/)
  assert.doesNotMatch(
    store,
    /\.select\("user_id,display_name,avatar_url,created_at,phone"\)/,
  )
  const page = readFileSync(new URL("../src/components/account-page.tsx", import.meta.url), "utf8")
  assert.match(page, /t\("profile\.buyerContact"\)/)
  assert.match(page, /ContactPhoneField/)
  const form = readFileSync(new URL("../src/components/post-form.tsx", import.meta.url), "utf8")
  assert.match(form, /prefillListingPhone/)
  assert.match(form, /ContactPhoneField/)
})
