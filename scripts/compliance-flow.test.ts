import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { privacyDueAt } from "../src/lib/privacy-rights"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("legal acceptance stores separate age and privacy evidence", () => {
  const signIn = source("src/components/sign-in-form.tsx")
  const route = source("src/app/api/terms/route.ts")
  const acceptance = source("src/lib/terms-acceptance.ts")
  const gate = source("src/lib/terms-gate.ts")
  const client = source("src/lib/terms-client.ts")
  const reaccept = source("src/components/terms-reaccept-dialog.tsx")
  const migration = source("database/migrations/20260929_privacy_rights_workflow.sql")

  assert.match(signIn, /ageConfirmed/)
  assert.match(signIn, /agreedToTerms/)
  assert.match(signIn, /auth\.ageConfirm/)
  assert.match(signIn, /auth\.legalAgreementPrefix/)
  assert.match(route, /ageAttested/)
  assert.match(route, /privacyAcknowledged/)
  assert.match(acceptance, /age_attested: true/)
  assert.match(acceptance, /privacy_acknowledged: true/)
  assert.match(acceptance, /LEGAL_DISCLOSURE_VERSION/)
  assert.match(gate, /data\.age_attested === true/)
  assert.match(gate, /data\.privacy_acknowledged === true/)
  assert.match(gate, /tableMissing\) return fail\(LEGAL_ACCEPTANCE_UNAVAILABLE_MESSAGE, 503\)/)
  assert.match(client, /if \(!intent \|\| !hasTermsIntent\(\)\) return false/)
  assert.doesNotMatch(client, /ageAttested: intent\?\.ageAttested \?\? true/)
  assert.doesNotMatch(client, /privacyAcknowledged: intent\?\.privacyAcknowledged \?\? true/)
  assert.match(reaccept, /pathname === "\/terms"/)
  assert.match(reaccept, /pathname\.startsWith\("\/privacy\/"\)/)
  assert.match(reaccept, /pathname === "\/account"/)
  assert.match(migration, /age_attested boolean not null default false/)
  assert.match(migration, /privacy_acknowledged boolean not null default false/)
})

test("privacy requests have a tracked server-only lifecycle", () => {
  const migration = source("database/migrations/20260929_privacy_rights_workflow.sql")
  const route = source("src/app/api/privacy/requests/route.ts")
  const admin = source("src/app/api/admin/privacy/route.ts")
  const page = source("src/components/privacy-request-page.tsx")

  assert.match(migration, /create table if not exists public\.privacy_requests/)
  assert.match(migration, /create table if not exists public\.privacy_request_events/)
  assert.match(migration, /verification_method/)
  assert.match(migration, /acknowledgment_sent_at/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /revoke all on table public\.privacy_requests, public\.privacy_request_events from anon, authenticated/)
  assert.match(route, /actingAsAgent/)
  assert.match(route, /verificationRequired/)
  assert.match(route, /requestType === "opt_out"/)
  assert.match(route, /requestType === "limit_sensitive"/)
  assert.match(route, /choiceRequestWithoutVerification/)
  assert.match(admin, /updatePrivacyRequest/)
  assert.match(page, /privacyRequest\.sensitiveWarning/)
  const en = source("src/lib/i18n/messages/en.ts")
  assert.match(en, /Do not enter passwords, government ID numbers, bank information, medical information/)
})

test("privacy target is stricter for California opt-out and limit requests", () => {
  const base = new Date("2026-09-29T12:00:00.000Z")
  const caOptOut = new Date(privacyDueAt("california", "opt_out", base))
  const caLimit = new Date(privacyDueAt("california", "limit_sensitive", base))
  const general = new Date(privacyDueAt("eu_eea", "access", base))
  assert.equal((caOptOut.getTime() - base.getTime()) / 86_400_000, 15)
  assert.equal((caLimit.getTime() - base.getTime()) / 86_400_000, 15)
  assert.equal((general.getTime() - base.getTime()) / 86_400_000, 28)
})

test("illegal-content notices capture structured facts without exposing reporter identity", () => {
  const reports = source("src/lib/reports.ts")
  const route = source("src/app/api/reports/route.ts")
  const detail = source("src/components/listing-detail.tsx")
  const migration = source("database/migrations/20260929_illegal_content_notice.sql")
  const admin = source("src/components/admin-reports-page.tsx")

  assert.match(reports, /illegal_content/)
  assert.match(reports, /goodFaith/)
  assert.match(route, /legalBasis/)
  assert.match(route, /jurisdiction/)
  assert.match(route, /goodFaith/)
  assert.match(detail, /reportLegalBasis/)
  assert.match(detail, /reportGoodFaith/)
  assert.match(migration, /legal_basis text/)
  assert.match(migration, /good_faith boolean not null default false/)
  assert.doesNotMatch(admin, /reporterId/)
})

test("restrictive moderation decisions are reversible and appealable", () => {
  const store = source("src/lib/board-store.ts")
  const redress = source("src/lib/moderation-redress.ts")
  const migration = source("database/migrations/20260929_moderation_redress.sql")
  const adminReports = source("src/components/admin-reports-page.tsx")
  const seller = source("src/components/moderation-decisions-page.tsx")

  assert.match(store, /restrictionType: "visibility_restricted"/)
  assert.match(store, /restrictionType: "content_removed"/)
  assert.match(store, /update\(\{ hidden_at: new Date\(\)\.toISOString\(\), hidden_reason: "admin" \}\)/)
  const removeStart = store.indexOf("export async function removeListingForReport")
  const removeEnd = store.indexOf("async function logModerationAction", removeStart)
  const moderatedRemove = store.slice(removeStart, removeEnd)
  assert.match(moderatedRemove, /update\(\{ hidden_at: new Date\(\)\.toISOString\(\), hidden_reason: "admin" \}\)/)
  assert.doesNotMatch(moderatedRemove, /from\("board_listings"\)\.delete/)
  assert.match(adminReports, /Reason shown to the listing owner/)
  assert.match(migration, /create table if not exists public\.moderation_appeals/)
  assert.match(migration, /appeal_until/)
  assert.match(redress, /setUTCMonth\(until\.getUTCMonth\(\) \+ 6\)/)
  assert.match(redress, /Internal moderation appeal/)
  assert.match(seller, /Submit appeal/)
})

test("compliance registry covers current and conditional law-to-product controls", () => {
  const compliance = source("src/lib/compliance.ts")
  const privacy = source("src/app/privacy/page.tsx")
  const choices = source("src/app/privacy/choices/page.tsx")

  for (const id of [
    "gdpr",
    "california",
    "caloppa",
    "us_states",
    "africa_privacy",
    "dsa",
    "eprivacy",
    "accessibility",
    "advertising",
    "inform",
    "communications",
    "coppa",
    "ftc",
    "dmca",
  ]) {
    assert.match(compliance, new RegExp(`id: "${id}"`))
  }
  assert.match(privacy, /California online tracking \/ Do Not Track/)
  assert.match(choices, /Global Privacy Control/)
  assert.match(choices, /Do Not Track/)
})

test("compliance incidents are tracked in server-only RLS tables", () => {
  const migration = source("database/migrations/20260929_privacy_rights_workflow.sql")
  const route = source("src/app/api/admin/compliance-incidents/route.ts")
  const page = source("src/components/admin-compliance-incidents-page.tsx")

  assert.match(migration, /create table if not exists public\.compliance_incidents/)
  assert.match(migration, /create table if not exists public\.compliance_incident_events/)
  assert.match(migration, /revoke all on table public\.compliance_incidents, public\.compliance_incident_events from anon, authenticated/)
  assert.match(route, /canOwner\(owner, "admin"\)/)
  assert.match(page, /Regulator notification required/)
  assert.match(page, /User notification required/)
})

test("privacy export includes compliance records tied to the account", () => {
  const helper = source("src/lib/privacy-export.ts")
  assert.match(helper, /age_attested/)
  assert.match(helper, /privacy_acknowledged/)
  assert.match(helper, /privacyRequests/)
  assert.match(helper, /moderationDecisions/)
  assert.match(helper, /moderationAppeals/)
})
