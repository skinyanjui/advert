import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { resolvePostingCountry } from "../src/lib/posting-country"

test("resolvePostingCountry prefers explicit URL, then signed-in profile, then device default", () => {
  assert.equal(
    resolvePostingCountry({
      urlCountry: "NG",
      savedPlaceCountry: "TZ",
      profileCountry: "ZA",
    }),
    "NG",
  )
  assert.equal(
    resolvePostingCountry({
      urlCountry: null,
      savedPlaceCountry: "tz",
      profileCountry: "ZA",
    }),
    "ZA",
  )
  assert.equal(
    resolvePostingCountry({
      urlCountry: "",
      savedPlaceCountry: "",
      profileCountry: "za",
    }),
    "ZA",
  )
})

test("resolvePostingCountry has no country default when nothing is set", () => {
  assert.equal(resolvePostingCountry({}), "")
  assert.equal(
    resolvePostingCountry({
      urlCountry: null,
      savedPlaceCountry: null,
      profileCountry: null,
    }),
    "",
  )
  assert.equal(resolvePostingCountry({ profileCountry: "XX" }), "")
})

test("posting uses saved default before temporary browsing location", () => {
  const place = readFileSync(new URL("../src/lib/active-place.ts", import.meta.url), "utf8")
  const homeIndex = place.indexOf("const home =")
  const activeIndex = place.indexOf("const active = readActivePlace()", homeIndex)
  assert.ok(homeIndex >= 0)
  assert.ok(activeIndex > homeIndex)
  assert.doesNotMatch(place, /return \{ country: "KE"/)
  assert.match(place, /return \{ country: "", city: "" \}/)

  const hook = readFileSync(new URL("../src/lib/use-remembered-place.ts", import.meta.url), "utf8")
  assert.match(hook, /export function usePostingPlace/)
  assert.match(hook, /if \(home\) return home[\s\S]*if \(!everywhere && active\) return active/)

  const postLink = readFileSync(new URL("../src/components/post-link.tsx", import.meta.url), "utf8")
  assert.match(postLink, /postAdHref\(null, extra\)/)
  assert.doesNotMatch(postLink, /usePostingPlace|useSearchParams/)
})

test("post form uses saved/profile country without an invented fallback", () => {
  const form = readFileSync(new URL("../src/components/post-form.tsx", import.meta.url), "utf8")
  assert.match(form, /resolvePostingCountry/)
  assert.match(form, /readHomePlace/)
  assert.match(form, /Signed-in users wait for the server profile/)
  assert.match(form, /profile\.countryCode/)
  assert.match(form, /Choose a country first/)
  assert.match(form, /set your country on Profile/)
  assert.match(form, /href="\/account"/)
  assert.doesNotMatch(form, /urlCountry \?\? "KE"/)
  assert.doesNotMatch(form, /existing\.country\) \?\? "KE"/)
  assert.doesNotMatch(form, /africanCurrencyForCountry\([^)]*\) \?\? "KES"/)
})

test("onboarding exposes and saves a posting country preference", () => {
  const signIn = readFileSync(new URL("../src/components/sign-in-form.tsx", import.meta.url), "utf8")
  assert.match(signIn, /id="onboarding-country"/)
  assert.match(signIn, /writeHomePlace\(\{ country \}\)/)
  assert.match(signIn, /default location when you post an ad/)
})
