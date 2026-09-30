import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { resolvePostingCountry } from "../src/lib/posting-country"

test("resolvePostingCountry prefers URL, then saved place, then profile", () => {
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
    "TZ",
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

test("resolvePostingCountry has no KE default when nothing is set", () => {
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

test("post form and readPostingPlace no longer hardcode KE fallback", () => {
  const form = readFileSync(new URL("../src/components/post-form.tsx", import.meta.url), "utf8")
  assert.match(form, /resolvePostingCountry/)
  assert.match(form, /Choose a country first/)
  assert.match(form, /set your country on Profile/)
  assert.match(form, /href="\/account"/)
  assert.doesNotMatch(form, /urlCountry \?\? "KE"/)
  assert.doesNotMatch(form, /existing\.country\) \?\? "KE"/)
  assert.doesNotMatch(form, /africanCurrencyForCountry\([^)]*\) \?\? "KES"/)

  const place = readFileSync(new URL("../src/lib/active-place.ts", import.meta.url), "utf8")
  assert.doesNotMatch(place, /return \{ country: "KE"/)
  assert.match(place, /return \{ country: "", city: "" \}/)
})
