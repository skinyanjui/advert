import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("privacy draft covers GDPR and California rights without claiming sale or sharing", () => {
  const privacy = source("src/app/privacy/page.tsx")
  assert.match(privacy, /GDPR legal bases/)
  assert.match(privacy, /Your GDPR rights/)
  assert.match(privacy, /California notice at collection/)
  assert.match(privacy, /California privacy rights/)
  assert.match(privacy, /Global Privacy Control/)
  assert.match(privacy, /does not sell personal information/)
  assert.match(privacy, /does not share personal\s+information for cross-context behavioral advertising/)
  assert.match(privacy, /International transfers/)
})

test("privacy choices page recognizes GPC and remains public", () => {
  const choices = source("src/app/privacy/choices/page.tsx")
  assert.match(choices, /requestHeaders\.get\("sec-gpc"\) === "1"/)
  assert.match(choices, /does not currently sell personal information/)
  assert.match(choices, /Access, correct, download, or delete/)
})

test("account privacy export is authenticated and excludes counterpart private identifiers", () => {
  const route = source("src/app/api/privacy/export/route.ts")
  const helper = source("src/lib/privacy-export.ts")
  assert.match(route, /canOwner\(owner, "profile"\)/)
  assert.match(route, /content-disposition/)
  assert.match(helper, /messagesSent/)
  assert.match(helper, /reportsSubmitted/)
  assert.match(helper, /contactEvents/)
  assert.match(helper, /whatsappConsentsGiven/)
  assert.match(helper, /legalAcceptances/)
  assert.doesNotMatch(helper, /peerName/)
})

test("account deletion removes account-linked privacy records", () => {
  const profileStore = source("src/lib/profile-store.ts")
  assert.match(profileStore, /from\("board_reports"\)\.delete\(\)\.eq\("reporter_id", userId\)/)
  assert.match(profileStore, /from\("board_contact_events"\)/)
  assert.match(profileStore, /eq\("actor_id", userId\)/)
  assert.match(profileStore, /from\("board_whatsapp_consents"\)/)
  assert.match(profileStore, /buyer_id\.eq\.\$\{userId\},seller_id\.eq\.\$\{userId\}/)
})

test("onboarding and terms set an adult-only account boundary", () => {
  const en = source("src/lib/i18n/messages/en.ts")
  const terms = source("src/app/terms/page.tsx")
  assert.match(en, /I confirm I am at least 18 years old/)
  assert.match(terms, /You must be at least 18 years old/)
  assert.match(terms, /not directed[\s\S]*children under 13/)
})

test("federal regulatory readiness covers marketplace communications consumer protection and DMCA", () => {
  const terms = source("src/app/terms/page.tsx")
  assert.match(terms, /INFORM Consumers Act/)
  assert.match(terms, /CAN-SPAM Act/)
  assert.match(terms, /Telephone Consumer Protection Act/)
  assert.match(terms, /Children[\s\S]*Online Privacy[\s\S]*Protection Act \(COPPA\)/)
  assert.match(terms, /Federal Trade Commission Act/)
  assert.match(terms, /Digital Millennium Copyright Act section 512/)
  assert.match(terms, /DMCA AGENT DETAILS/)
})

test("public privacy contact can be configured without hard-coding an address", () => {
  const site = source("src/lib/site.ts")
  const env = source(".env.example")
  assert.match(site, /NEXT_PUBLIC_SUPPORT_EMAIL/)
  assert.match(env, /NEXT_PUBLIC_SUPPORT_EMAIL=privacy@example\.com/)
})
