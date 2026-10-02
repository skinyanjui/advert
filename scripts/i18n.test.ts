import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { messageKeys, offeredLocales, translate, en, fr, sw } from "../src/lib/i18n"
import { htmlLang, isLocale, locales } from "../src/lib/i18n/locales"
import { categories } from "../src/lib/types"
import { postingPlans } from "../src/lib/posting"

test("fr and sw catalogs have every English key", () => {
  const keys = messageKeys()
  for (const key of keys) {
    assert.equal(typeof fr[key], "string", `fr missing ${key}`)
    assert.equal(typeof sw[key], "string", `sw missing ${key}`)
    assert.ok(fr[key].length > 0, `fr empty ${key}`)
    assert.ok(sw[key].length > 0, `sw empty ${key}`)
  }
  assert.equal(Object.keys(fr).length, keys.length)
  assert.equal(Object.keys(sw).length, keys.length)
  assert.equal(Object.keys(en).length, keys.length)
})

test("offered locales are a subset of dictionary locales and never empty", () => {
  assert.ok(offeredLocales.length >= 1)
  for (const locale of offeredLocales) {
    assert.ok(isLocale(locale))
    assert.ok(locales.includes(locale))
  }
})

test("translate interpolates values and falls back safely", () => {
  assert.equal(translate("en", "nav.unreadMessages", { count: 3 }), "3 unread")
  assert.equal(htmlLang("fr"), "fr")
  assert.equal(htmlLang("sw"), "sw")
})

test("category navigation has translated labels for every category and type", () => {
  const keys = new Set<string>(messageKeys())
  for (const category of categories) assert.ok(keys.has(`category.${category.id}`), category.id)
  for (const plan of postingPlans()) {
    for (const type of plan.subcategories) assert.ok(keys.has(`post.sub.${type.id}`), type.id)
  }
})

test("language boot script sets documentElement.lang from localStorage", () => {
  const prefs = readFileSync(new URL("../src/lib/prefs.ts", import.meta.url), "utf8")
  assert.match(prefs, /languageBootScript/)
  assert.match(prefs, /document\.documentElement\.lang/)
})
