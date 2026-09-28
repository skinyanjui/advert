import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { messageKeys, offeredLocales, translate, en, fr, sw } from "../src/lib/i18n"
import { htmlLang, isLocale, locales } from "../src/lib/i18n/locales"

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

test("offered locales include en, fr, and sw", () => {
  assert.deepEqual([...offeredLocales], ["en", "fr", "sw"])
  for (const locale of offeredLocales) {
    assert.ok(isLocale(locale))
    assert.ok(locales.includes(locale))
  }
})

test("translate interpolates values and falls back safely", () => {
  assert.equal(translate("en", "nav.unreadMessages", { count: 3 }), "3 unread")
  assert.equal(translate("sw", "nav.unreadMessages", { count: 3 }), "Ujumbe 3 ambao haujasomwa")
  assert.equal(translate("sw", "nav.notificationsUnreadCount", { count: 3, messages: "ujumbe" }), "Ujumbe 3 ambao haujasomwa")
  assert.equal(htmlLang("fr"), "fr")
  assert.equal(htmlLang("sw"), "sw")
})

test("language boot script sets documentElement.lang from localStorage", () => {
  const prefs = readFileSync(new URL("../src/lib/prefs.ts", import.meta.url), "utf8")
  assert.match(prefs, /languageBootScript/)
  assert.match(prefs, /document\.documentElement\.lang/)
})

/** Paths under src/components and src/app where English JSX copy is intentional. */
const HARDCODED_ALLOWLIST = new Set([
  "src/app/terms/page.tsx",
  "src/app/privacy/page.tsx",
  "src/components/credits-page-content.tsx",
])

/** Exact attribute/text values that stay English on purpose (tokens, brand, etc.). */
const HARDCODED_VALUE_ALLOWLIST = new Set([
  "DELETE", // account deletion confirmation token — same in every locale
])

const JSX_TEXT = />([A-Z][^<{]{2,120})</g
const ATTR_TEXT = /\b(?:placeholder|aria-label|title|alt)=["']([A-Z][^"']{2,120})["']/g
const TOAST_TEXT = /toast\.(?:success|error|message|info)\(\s*["']([^"']+)["']/g

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === "ui") continue
      walkTsx(full, out)
    } else if (name.endsWith(".tsx")) {
      out.push(full)
    }
  }
  return out
}

test("no hardcoded English UI copy in src/components and src/app JSX", () => {
  const roots = [
    path.join(process.cwd(), "src/components"),
    path.join(process.cwd(), "src/app"),
  ]
  const hits: string[] = []
  for (const root of roots) {
    for (const file of walkTsx(root)) {
      const rel = path.relative(process.cwd(), file).replaceAll("\\", "/")
      if (HARDCODED_ALLOWLIST.has(rel)) continue
      const lines = readFileSync(file, "utf8").split(/\r?\n/)
      lines.forEach((line, index) => {
        if (/\bt\s*\(/.test(line) || /translate\s*\(/.test(line)) return
        for (const re of [JSX_TEXT, ATTR_TEXT, TOAST_TEXT]) {
          re.lastIndex = 0
          let match: RegExpExecArray | null
          while ((match = re.exec(line))) {
            const value = match[1].trim()
            if (HARDCODED_VALUE_ALLOWLIST.has(value)) continue
            if (/^https?:\/\//i.test(value)) continue
            hits.push(`${rel}:${index + 1}: ${value}`)
          }
        }
      })
    }
  }
  assert.equal(hits.length, 0, `Hardcoded English UI strings:\n${hits.join("\n")}`)
})
