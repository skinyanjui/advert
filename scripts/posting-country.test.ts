import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { normalizePostDraft, type PostDraft } from "../src/lib/post-draft"
import { resolvePostingCountry, resolvePostingDraftLocation } from "../src/lib/posting-country"

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
  assert.match(form, /readPostingPlace/)
  assert.match(form, /Signed-in users wait for the server profile/)
  assert.match(form, /profile\.countryCode/)
  assert.match(form, /Choose a country first/)
  assert.match(form, /set your country on Profile/)
  assert.match(form, /href="\/account"/)
  assert.doesNotMatch(form, /urlCountry \?\? "KE"/)
  assert.doesNotMatch(form, /existing\.country\) \?\? "KE"/)
  assert.doesNotMatch(form, /africanCurrencyForCountry\([^)]*\) \?\? "KES"/)
})

const savedDraft: PostDraft = {
  flowVersion: 3, step: 2, category: "vehicles", subcategoryId: "cars",
  title: "Draft car listing", price: "5000", period: "fixed", details: {},
  country: "ZW", currency: "BWP", city: "Harare", locationSource: "default",
  latitude: -17.83, longitude: 31.05, timezone: "Africa/Harare", locationPrecision: "city",
  description: "Keep the draft description", phone: "", photos: ["draft-photo"], savedAt: 1000,
}

test("an inherited Zimbabwe draft follows the current Settings country and currency", () => {
  const draft = normalizePostDraft(savedDraft, 1100)!
  const location = resolvePostingDraftLocation({ draft, defaultCountry: "UG", defaultCity: "Kampala" })
  assert.equal(location.country, "UG")
  assert.equal(location.currency, "UGX")
  assert.equal(location.city, "Kampala")
  assert.equal(location.locationSource, "default")
  assert.equal(location.latitude, undefined)
  assert.equal(location.longitude, undefined)
  assert.equal(location.timezone, undefined)
  assert.equal(draft.title, savedDraft.title)
  assert.deepEqual(draft.photos, savedDraft.photos)
})

test("legacy unfinished drafts release their stale country default", () => {
  const draft = normalizePostDraft({ ...savedDraft, locationSource: undefined }, 1100)!
  assert.equal(draft.locationSource, "default")
  const location = resolvePostingDraftLocation({ draft, defaultCountry: "KE", defaultCity: "Nairobi" })
  assert.equal(location.country, "KE")
  assert.equal(location.currency, "KES")
  assert.equal(location.city, "Nairobi")
})

test("a deliberately chosen draft country survives a different Settings default", () => {
  const draft = normalizePostDraft({ ...savedDraft, locationSource: "chosen" }, 1100)!
  const location = resolvePostingDraftLocation({ draft, defaultCountry: "KE", defaultCity: "Nairobi" })
  assert.equal(location.country, "ZW")
  assert.equal(location.currency, "BWP")
  assert.equal(location.city, "Harare")
  assert.equal(location.latitude, savedDraft.latitude)
  assert.equal(location.locationSource, "chosen")
})

test("legacy drafts with a pickup description or specific pin keep their chosen location", () => {
  for (const patch of [{ locationDetail: "Public pickup point" }, { locationPrecision: "specific" as const }]) {
    const draft = normalizePostDraft({ ...savedDraft, locationSource: undefined, ...patch }, 1100)!
    assert.equal(draft.locationSource, "chosen")
    const location = resolvePostingDraftLocation({ draft, defaultCountry: "UG" })
    assert.equal(location.country, "ZW")
    assert.equal(location.latitude, savedDraft.latitude)
    assert.equal(location.locationDetail, draft.locationDetail ?? "")
  }
})

test("explicit posting locations override drafts without carrying a pin from another place", () => {
  const draft = normalizePostDraft({ ...savedDraft, locationSource: "chosen", locationDetail: "Harare pickup" }, 1100)!
  for (const target of [{ urlCountry: "KE", urlCity: "Nairobi" }, { urlCountry: "ZW", urlCity: "Bulawayo" }]) {
    const location = resolvePostingDraftLocation({ draft, defaultCountry: "UG", ...target })
    assert.equal(location.country, target.urlCountry)
    assert.equal(location.city, target.urlCity)
    assert.equal(location.locationDetail, "")
    assert.equal(location.latitude, undefined)
    assert.equal(location.locationSource, "chosen")
  }
  const matching = resolvePostingDraftLocation({ draft, urlCountry: "ZW", urlCity: "Harare" })
  assert.equal(matching.locationDetail, "Harare pickup")
  assert.equal(matching.latitude, savedDraft.latitude)
})

test("an inherited draft cannot invent a country when Settings and browsing have none", () => {
  const location = resolvePostingDraftLocation({ draft: savedDraft, defaultCountry: "XX", defaultCity: "Nairobi" })
  assert.equal(location.country, "")
  assert.equal(location.city, "")
  assert.equal(location.currency, "")
  assert.equal(location.latitude, undefined)
})

test("automatic city defaults refresh within the same country without retaining an old pin", () => {
  const draft = { ...savedDraft, country: "KE", currency: "KES", city: "Nairobi" }
  const location = resolvePostingDraftLocation({ draft, defaultCountry: "KE", defaultCity: "Kisumu" })
  assert.equal(location.city, "Kisumu")
  assert.equal(location.currency, "KES")
  assert.equal(location.latitude, undefined)
})

test("draft location intent is validated and retained through recovery", () => {
  for (const locationSource of ["default", "chosen"] as const) {
    assert.equal(normalizePostDraft({ ...savedDraft, locationSource }, 1100)?.locationSource, locationSource)
  }
  assert.equal(normalizePostDraft({ ...savedDraft, locationSource: "Zimbabwe" }, 1100), null)
})

test("onboarding exposes and saves a posting country preference", () => {
  const signIn = readFileSync(new URL("../src/components/sign-in-form.tsx", import.meta.url), "utf8")
  assert.match(signIn, /id="onboarding-country"/)
  assert.match(signIn, /writeHomePlace\(\{ country \}\)/)
  assert.match(signIn, /default location when you post an ad/)
})
