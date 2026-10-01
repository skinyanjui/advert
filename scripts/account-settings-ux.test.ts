import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("account settings uses a task-oriented information architecture", () => {
  const page = source("src/components/account-page.tsx")
  const nav = source("src/components/account-settings-nav.tsx")

  assert.match(page, /id="profile"/)
  assert.match(page, /id="preferences"/)
  assert.match(page, /id="security"/)
  assert.match(page, /id="privacy"/)
  assert.match(page, /id="account-management"/)
  assert.match(page, /md:grid-cols-\[13rem_minmax\(0,1fr\)\]/)
  assert.match(nav, /Settings sections/)
  assert.match(nav, /Identity and contact/)
  assert.match(nav, /Email, password, sessions/)
  assert.match(nav, /#account-management/)
  assert.match(nav, /aria-current=\{active \? "location"/)
  assert.match(nav, /sticky top-14/)
  assert.match(nav, /IntersectionObserver/)
})

test("account settings exposes save state and separates destructive actions", () => {
  const page = source("src/components/account-page.tsx")

  assert.match(page, /Unsaved profile changes/)
  assert.match(page, /Profile is up to date/)
  assert.match(page, /Unsaved contact change/)
  assert.match(page, /Permanent account actions are kept separate from everyday settings/)
  assert.match(page, /role="status"/)
})

test("admin operations are separated from personal settings", () => {
  const page = source("src/components/account-page.tsx")

  assert.match(page, /Administration/)
  assert.match(page, /Operational tools are separate from personal account settings/)
})


test("privacy action rows have specific accessible names", () => {
  const page = source("src/components/account-page.tsx")

  assert.match(page, /aria-label=\{`Open \$\{t\("profile\.privacyChoices"\)\}`\}/)
  assert.match(page, /aria-label=\{`Open \$\{t\("profile\.privacyRequest"\)\}`\}/)
  assert.match(page, /aria-label="Open moderation decisions"/)
})
