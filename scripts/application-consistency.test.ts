import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("shared navigation and Messenger terminology stay consistent", () => {
  const nav = source("src/lib/nav.ts")
  const en = source("src/lib/i18n/messages/en.ts")
  const fr = source("src/lib/i18n/messages/fr.ts")
  const sw = source("src/lib/i18n/messages/sw.ts")

  assert.match(nav, /label: "Messenger"/)
  assert.doesNotMatch(nav, /label: "Messages"/)
  for (const messages of [en, fr, sw]) {
    assert.match(messages, /"nav\.messages": "Messenger"/)
    assert.match(messages, /"inbox\.title": "Messenger"/)
    assert.match(messages, /"messages\.title": "Messenger"/)
  }
})

test("member-only pages enforce sign-in at their own route boundary", () => {
  const saved = source("src/components/collections.tsx")
  const myAds = source("src/components/my-ads-page.tsx")
  const messenger = source("src/components/messages-page.tsx")
  const menu = source("src/components/profile-menu.tsx")

  assert.match(saved, /router\.replace\(signInHref\("\/saved"\)\)/)
  assert.match(myAds, /router\.replace\(signInHref\("\/my-ads"\)\)/)
  assert.match(messenger, /router\.replace\(signInHref\("\/messages"\)\)/)
  assert.match(menu, /auth\.signedIn \? \(\s*<>[\s\S]*href="\/messages"[\s\S]*href="\/saved"/)
})

test("legal acceptance stays at onboarding and account access boundaries", () => {
  const post = source("src/components/post-form.tsx")
  const reply = source("src/components/inbox/reply-form.tsx")
  const signIn = source("src/components/sign-in-form.tsx")
  const reaccept = source("src/components/terms-reaccept-dialog.tsx")

  assert.equal(existsSync(new URL("../src/components/terms-notice.tsx", import.meta.url)), false)
  assert.doesNotMatch(post, /TermsNotice/)
  assert.doesNotMatch(reply, /TermsNotice/)
  assert.match(signIn, /auth\.agreeAccountPrefix/)
  assert.match(signIn, /auth\.mustAgree/)
  assert.match(reaccept, /terms\.reacceptTitle/)
  assert.match(reaccept, /terms\.reacceptBody/)
})

test("Messenger has no demo inbox fallback", () => {
  const page = source("src/components/messages-page.tsx")
  const list = source("src/components/inbox/conversation-list.tsx")
  const panel = source("src/components/inbox/conversation-panel.tsx")

  assert.equal(existsSync(new URL("../src/lib/sample-conversations.ts", import.meta.url)), false)
  assert.doesNotMatch(page, /sampleThreads|showingSamples|demo=/)
  assert.match(list, /t\("inbox\.title"\)/)
  assert.match(panel, /t\("inbox\.replyPlaceholder"\)/)
})

test("listing contact actions behave consistently across layouts", () => {
  const detail = source("src/components/listing-detail.tsx")

  assert.match(detail, /smsHref\(listing\.phone, listing\.title\)/)
  assert.match(detail, /href=\{whatsappHref\(listing\.phone, listing\.title\)\}/)
  assert.match(detail, /onClick=\{revealAndCall\}/)
  assert.match(detail, /id="listing-message-composer"/)
  assert.doesNotMatch(detail, /<Dialog open=\{messageOpen && contactOpen\}/)
  assert.doesNotMatch(detail, />Listing ID \{listing\.id\}</)
})

test("onboarding no longer promises guest access to protected posting", () => {
  const signIn = source("src/components/sign-in-form.tsx")
  const readme = source("README.md")

  assert.doesNotMatch(signIn, /Until then you can still post with this browser session/)
  assert.match(signIn, /Protected account actions stay unavailable|auth\.notConfiguredBody/)
  assert.match(readme, /not considered deployed until the corresponding Vercel deployment is confirmed `READY`/)
})


test("Vercel automatic Git deployments are production-only", () => {
  const config = JSON.parse(source("vercel.json")) as {
    git?: { deploymentEnabled?: Record<string, boolean> }
  }
  assert.equal(config.git?.deploymentEnabled?.["**"], false)
  assert.equal(config.git?.deploymentEnabled?.main, true)
})
