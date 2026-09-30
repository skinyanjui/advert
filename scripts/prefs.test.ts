import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  currencyPreferenceError,
  languageError,
  normalizeProfileUpdate,
} from "../src/lib/profile"
import {
  defaultCurrencyPreference,
  isCurrencyPreference,
  normalizeCurrencyPreference,
  normalizeLanguagePreference,
} from "../src/lib/prefs"
import { listingGridClassName, listingGridClassNameLoose } from "../src/lib/listing-grid"

const migration = readFileSync(
  new URL("../supabase/migrations/20260928_profile_language_currency.sql", import.meta.url),
  "utf8",
)

test("language/currency migration adds nullable columns and keeps service-role-only", () => {
  assert.match(migration, /add column if not exists language/i)
  assert.match(migration, /add column if not exists currency/i)
  assert.match(migration, /board_profiles_language_check/)
  assert.match(migration, /board_profiles_currency_check/)
  assert.match(migration, /revoke all on table public\.board_profiles from anon, authenticated/i)
  assert.doesNotMatch(migration, /grant select, insert, update, delete on public\.board_profiles/i)
  assert.doesNotMatch(migration, /create policy/i)
})

test("language and currency preference validation", () => {
  assert.equal(languageError("en"), undefined)
  assert.equal(languageError("fr"), undefined)
  assert.equal(languageError("sw"), undefined)
  assert.equal(languageError("de"), "Choose a supported language.")
  assert.equal(currencyPreferenceError("USD"), undefined)
  assert.equal(currencyPreferenceError("KES"), undefined)
  assert.equal(currencyPreferenceError("CAD"), "Choose a currency used on the board.")
  assert.equal(isCurrencyPreference("listing"), false)
  assert.equal(normalizeCurrencyPreference("kes"), defaultCurrencyPreference) // invalid casing path via isCurrencyPreference
  assert.equal(normalizeCurrencyPreference("KES"), "KES")
  assert.equal(normalizeLanguagePreference("fr"), "fr")
  assert.equal(normalizeLanguagePreference("de"), "en")
})

test("normalizeProfileUpdate accepts language and currency patches", () => {
  const ok = normalizeProfileUpdate({ language: "FR", currency: "kes" })
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.equal(ok.value.language, "fr")
    assert.equal(ok.value.currency, "KES")
  }
  const listing = normalizeProfileUpdate({ currency: "listing" })
  assert.equal(listing.ok, false)
  const bad = normalizeProfileUpdate({ language: "xx" })
  assert.equal(bad.ok, false)
})

test("language and currency stay on the same row on every shared preference surface", () => {
  const fields = readFileSync(
    new URL("../src/components/language-currency-fields.tsx", import.meta.url),
    "utf8",
  )
  const signIn = readFileSync(new URL("../src/components/sign-in-form.tsx", import.meta.url), "utf8")
  const account = readFileSync(new URL("../src/components/account-page.tsx", import.meta.url), "utf8")
  const profileMenu = readFileSync(new URL("../src/components/profile-menu.tsx", import.meta.url), "utf8")

  assert.match(fields, /grid grid-cols-2/)
  assert.doesNotMatch(fields, /sm:grid-cols-2/)
  assert.doesNotMatch(fields, /space-y-2 px-2 py-1\.5/)
  assert.match(signIn, /<LanguageCurrencyFields idPrefix="onboarding" \/>/)
  assert.match(account, /<LanguageCurrencyFields \/>/)
  assert.match(profileMenu, /<LanguageCurrencyFields layout="menu" idPrefix="profile-menu" \/>/)
  assert.doesNotMatch(signIn, /onboarding-currency/)
  assert.doesNotMatch(signIn, /Listing currency/)
})

test("listing grids use 5 columns from xl (1280px) and keep 2 cols on small screens", () => {
  assert.match(listingGridClassName, /grid-cols-2/)
  assert.match(listingGridClassName, /lg:grid-cols-3/)
  assert.match(listingGridClassName, /xl:grid-cols-5/)
  assert.doesNotMatch(listingGridClassName, /xl:grid-cols-4/)
  assert.match(listingGridClassNameLoose, /xl:grid-cols-5/)

  for (const file of [
    "../src/components/browse.tsx",
    "../src/components/board-shell.tsx",
    "../src/components/collections.tsx",
    "../src/components/listing-detail.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8")
    assert.match(source, /listingGridClassName/)
    assert.doesNotMatch(source, /xl:grid-cols-4 2xl:grid-cols-5/)
  }
})

test("header moves notifications into the profile menu and drops top-nav message/bell icons", () => {
  const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8")
  const profileMenu = readFileSync(new URL("../src/components/profile-menu.tsx", import.meta.url), "utf8")
  assert.match(header, /ProfileNotifications/)
  assert.match(header, /<ProfileMenu notifications=\{<ProfileNotifications \/>\}/)
  assert.match(profileMenu, /LanguageCurrencyFields/)
  assert.match(profileMenu, /href="\/messages"/)
  assert.match(header, /navItem\("home"\)/)
  assert.match(header, /md:hidden/)
  assert.doesNotMatch(header, /NavIconLink/)
  assert.doesNotMatch(header, /NotificationsMenu/)
  assert.doesNotMatch(header, /<Bell/)
})
