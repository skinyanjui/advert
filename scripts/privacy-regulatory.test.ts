import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import nextConfig from "../next.config"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("the initial document permits same-origin posting location requests after client navigation", async () => {
  const groups = await nextConfig.headers!()
  const policy = groups.find((group) => group.source === "/(.*)")?.headers
    .find((header) => header.key === "Permissions-Policy")?.value
  assert.equal(policy, "camera=(), microphone=(), geolocation=(self)")
})

test("privacy policy covers GDPR and California rights without claiming sale or sharing", () => {
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

test("privacy choices page recognizes GPC and discloses DNT", () => {
  const choices = source("src/app/privacy/choices/page.tsx")
  assert.match(choices, /requestHeaders\.get\("sec-gpc"\) === "1"/)
  assert.match(choices, /requestHeaders\.get\("dnt"\) === "1"/)
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

test("account deletion removes account-linked privacy records through a durable database cleanup", () => {
  const worker = source("src/lib/account-deletion.ts")
  const migration = source("database/migrations/20261002_operational_hardening.sql")
  assert.match(worker, /begin_board_account_deletion/)
  assert.match(worker, /cleanup_board_account_data/)
  assert.match(migration, /delete from public\.board_reports where reporter_id=p_user/)
  assert.match(migration, /delete from public\.board_contact_events where actor_id=p_user/)
  assert.match(migration, /delete from public\.board_whatsapp_consents where buyer_id=p_user or seller_id=p_user/)
})

test("onboarding and terms set an adult-only account boundary", () => {
  const en = source("src/lib/i18n/messages/en.ts")
  const terms = source("src/app/terms/page.tsx")
  assert.match(en, /I confirm I am at least 18 years old/)
  assert.match(en, /I agree to the/)
  assert.match(en, /acknowledge that I have read the/)
  assert.match(terms, /Account holders must be at least 18 years old/)
  })

test("federal marketplace and communications statements avoid unverified registration claims", () => {
  const terms = source("src/app/terms/page.tsx")
  assert.match(terms, /Copyright/)
  assert.match(terms, /DMCA/)
  assert.match(terms, /does not represent[\s\S]*designated-agent registration is active/)
  assert.doesNotMatch(terms, /DMCA AGENT DETAILS|LAWYER TO CONFIRM|\[PLACEHOLDER/)
})

test("public privacy contact can be configured without hard-coding an address", () => {
  const site = source("src/lib/site.ts")
  const env = source(".env.example")
  assert.match(site, /NEXT_PUBLIC_SUPPORT_EMAIL/)
  assert.match(env, /NEXT_PUBLIC_SUPPORT_EMAIL/)
})


test("assurance frameworks stay evidence-gated and never become decorative compliance claims", () => {
  const compliance = source("src/lib/compliance.ts")
  const env = source(".env.example")
  const contact = source("src/app/contact/page.tsx")
  const nextConfig = source("next.config.ts")

  for (const key of [
    "COMPLIANCE_SOC2_REPORT",
    "COMPLIANCE_ISO27001_CERTIFICATE",
    "COMPLIANCE_CASA_TIER2_ASSESSMENT",
    "COMPLIANCE_DPF_PARTICIPATION",
    "COMPLIANCE_PCI_DSS_ATTESTATION",
  ]) {
    assert.match(env, new RegExp(key))
    assert.match(compliance, new RegExp(key))
  }
  assert.match(compliance, /ISO\/IEC 27001:2022/)
  assert.match(compliance, /PCI DSS v4\.0\.1/)
  assert.match(compliance, /do not display a SOC 2 badge/)
  assert.match(compliance, /do not claim DPF certification\/participation/)
  assert.match(contact, /Security/)
  assert.match(contact, /Legal & compliance/)
  assert.match(nextConfig, /X-Content-Type-Options/)
  assert.match(nextConfig, /Strict-Transport-Security/)
  assert.match(nextConfig, /Permissions-Policy/)
})


test("listing flow applies privacy by default and rejects obvious sensitive payment data", () => {
  const post = source("src/components/post-form.tsx")
  const rules = source("src/lib/listing-rules.ts")
  const privacy = source("src/app/privacy/page.tsx")
  const terms = source("src/app/terms/page.tsx")

  assert.match(post, /Marketplace messages work without sharing a phone number/)
  assert.match(post, /payment-card details/)
  assert.match(rules, /paymentCardPattern/)
  assert.match(rules, /sensitiveIdentifierPattern/)
  assert.match(rules, /Remove payment-card or sensitive identity information/)
  assert.match(privacy, /New listings default to marketplace messaging/)
  assert.match(privacy, /regulations effective January 1, 2026/)
  assert.match(privacy, /beginning January 1, 2027/)
  assert.match(terms, /does not hold purchase money in escrow/)
})
