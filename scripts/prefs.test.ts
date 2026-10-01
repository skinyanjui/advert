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
import { listingGridClassName } from "../src/lib/listing-grid"

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
  assert.equal(currencyPreferenceError("USD"), "Choose a currency used on the board.")
  assert.equal(currencyPreferenceError("KES"), undefined)
  assert.equal(currencyPreferenceError("listing"), undefined)
  assert.equal(currencyPreferenceError("CAD"), "Choose a currency used on the board.")
  assert.equal(isCurrencyPreference("listing"), true)
  assert.equal(defaultCurrencyPreference, "listing")
  assert.equal(normalizeCurrencyPreference("kes"), defaultCurrencyPreference)
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
  assert.equal(listing.ok, true)
  const bad = normalizeProfileUpdate({ language: "xx" })
  assert.equal(bad.ok, false)
})

test("language and currency stay together in onboarding and account preferences", () => {
  const fields = readFileSync(new URL("../src/components/language-currency-fields.tsx", import.meta.url), "utf8")
  const signIn = readFileSync(new URL("../src/components/sign-in-form.tsx", import.meta.url), "utf8")
  const account = readFileSync(new URL("../src/components/account-page.tsx", import.meta.url), "utf8")
  const profileMenu = readFileSync(new URL("../src/components/profile-menu.tsx", import.meta.url), "utf8")
  assert.match(fields, /grid grid-cols-2/)
  assert.match(signIn, /<LanguageCurrencyFields idPrefix="onboarding" \/>/)
  assert.match(account, /<LanguageCurrencyFields \/>/)
  assert.doesNotMatch(profileMenu, /LanguageCurrencyFields|ThemeChoices/)
})

test("listing grids use 5 columns from xl (1280px) and keep 2 cols on small screens", () => {
  assert.match(listingGridClassName, /grid-cols-2/)
  assert.match(listingGridClassName, /lg:grid-cols-3/)
  assert.match(listingGridClassName, /xl:grid-cols-5/)
  assert.doesNotMatch(listingGridClassName, /xl:grid-cols-4/)

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

test("guest browsing preferences stay accessible outside authentication", () => {
  const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8")
  const categories = readFileSync(new URL("../src/components/category-top-nav.tsx", import.meta.url), "utf8")
  const profile = readFileSync(new URL("../src/components/profile-menu.tsx", import.meta.url), "utf8")
  const account = readFileSync(new URL("../src/components/account-page.tsx", import.meta.url), "utf8")
  assert.match(header, /<ProfileMenu \/>/)
  assert.match(header, /<LanguageCurrencyMenu \/>/)
  assert.match(header, /<Globe2 className="size-4"/)
  assert.doesNotMatch(header, /summary=\{<span className="text-xs font-medium">\{t\("prefs\.language"\)\}/)
  assert.match(header, /<ThemeMenu \/>/)
  assert.match(categories, /<LanguageCurrencyFields layout="menu" idPrefix="mobile-pref" \/>/)
  assert.match(categories, /<ThemeChoices \/>/)
  assert.doesNotMatch(profile, /ThemeChoices|ThemeMenu|LanguageCurrencyFields/)
  assert.match(profile, />Settings</)
  assert.match(account, /<CardTitle>Preferences<\/CardTitle>/)
  assert.match(account, /id="preferences"/)
  assert.match(account, /<ThemeChoices \/>/)
})

test("sidebar geometry follows the compact header without a vertical gap", () => {
  const categories = readFileSync(new URL("../src/components/category-top-nav.tsx", import.meta.url), "utf8")
  assert.match(categories, /sticky top-14/)
  assert.ok(categories.includes("h-[calc(100svh-3.5rem)]"))
  assert.match(categories, /md:top-16/)
  assert.ok(categories.includes("md:h-[calc(100svh-4rem)]"))
})




test("browse keeps sorting behavior but removes the dedicated sort toolbar", () => {
  const browse = readFileSync(new URL("../src/components/browse.tsx", import.meta.url), "utf8")
  assert.match(browse, /sortListings\(filtered, query\.sort/)
  assert.doesNotMatch(browse, /<Select/)
  assert.doesNotMatch(browse, /Sort:/)
  assert.doesNotMatch(browse, /ArrowUpDown/)
  assert.doesNotMatch(browse, /resultSummary/)
  assert.doesNotMatch(browse, /closestFirst/)
})


test("browse removes duplicate city controls and keeps listings visually dominant", () => {
  const browse = readFileSync(new URL("../src/components/browse.tsx", import.meta.url), "utf8")
  assert.match(browse, /<BoardCitySearch/)
  assert.doesNotMatch(browse, /function CityPill/)
  assert.doesNotMatch(browse, /All cities<\//)
  assert.match(browse, /mb-2\.5 max-w-sm sm:mb-3/)
  assert.match(browse, /Search all cities/)
  assert.match(browse, /View all types/)
  assert.doesNotMatch(browse, /onClearCity/)
  assert.doesNotMatch(browse, /onClearType/)
  assert.doesNotMatch(browse, /const narrowed/)
})
