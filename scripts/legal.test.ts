import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_VERSION,
  PROHIBITED_ITEM_SUMMARY,
  TERMS_ACCEPTANCE_CONTEXTS,
  TERMS_OUTDATED_MESSAGE,
  TERMS_VERSION,
  isTermsAcceptanceContext,
} from "../src/lib/legal"
import { site, siteSupportMailto, SUPPORT_CONTACT_PLACEHOLDER } from "../src/lib/site"

test("legal versions and effective date are set", () => {
  assert.ok(TERMS_VERSION.length > 0)
  assert.ok(PRIVACY_VERSION.length > 0)
  assert.ok(LEGAL_EFFECTIVE_DATE.length > 0)
})

test("prohibited summary stays aligned with listing-rules keywords", () => {
  const rules = readFileSync(new URL("../src/lib/listing-rules.ts", import.meta.url), "utf8")
  assert.match(rules, /cocaine/)
  assert.ok(rules.includes("ak-?47"))
  assert.ok(PROHIBITED_ITEM_SUMMARY.some((item) => /cocaine/i.test(item)))
  assert.ok(PROHIBITED_ITEM_SUMMARY.some((item) => /AK-47/i.test(item)))
})

test("acceptance contexts are signup and reaccept only", () => {
  assert.deepEqual([...TERMS_ACCEPTANCE_CONTEXTS], ["signup", "reaccept"])
  assert.equal(isTermsAcceptanceContext("signup"), true)
  assert.equal(isTermsAcceptanceContext("reaccept"), true)
  assert.equal(isTermsAcceptanceContext("other"), false)
})

test("terms outdated message matches the product copy", () => {
  assert.equal(TERMS_OUTDATED_MESSAGE, "Accept the updated Terms to continue.")
})

test("support contact is unset until a public address is configured", () => {
  assert.equal(site.supportEmail, undefined)
  assert.equal(siteSupportMailto(), undefined)
  assert.match(SUPPORT_CONTACT_PLACEHOLDER, /support address to be added/i)
  assert.match(SUPPORT_CONTACT_PLACEHOLDER, /Report on any listing/i)
})

test("terms acceptance migration is append-only with RLS and no public grants", () => {
  const sql = readFileSync(
    new URL("../database/migrations/20260928_terms_acceptance.sql", import.meta.url),
    "utf8",
  )
  assert.match(sql, /create table if not exists public\.terms_acceptances/)
  assert.match(sql, /context in \('signup', 'reaccept'\)/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /revoke all on table public\.terms_acceptances from anon, authenticated/)
  assert.doesNotMatch(sql, /update public\.terms_acceptances/)
  assert.doesNotMatch(sql, /delete from public\.terms_acceptances/)
})

test("sponsored ads migration adds column, reason, and moderation log", () => {
  const sql = readFileSync(
    new URL("../database/migrations/20260928_sponsored_ads.sql", import.meta.url),
    "utf8",
  )
  assert.match(sql, /add column if not exists sponsored boolean not null default false/)
  assert.match(sql, /undisclosed_promo/)
  assert.match(sql, /create table if not exists public\.moderation_actions/)
  assert.match(sql, /enable row level security/)
})

test("moderation audit follow-up drops FKs and adds sponsored_locked", () => {
  const sql = readFileSync(
    new URL("../database/migrations/20260928_moderation_audit_sponsored_lock.sql", import.meta.url),
    "utf8",
  )
  assert.match(sql, /drop constraint if exists moderation_actions_listing_id_fkey/)
  assert.match(sql, /drop constraint if exists moderation_actions_report_id_fkey/)
  assert.match(sql, /add column if not exists sponsored_locked boolean not null default false/)
})

test("terms intent helpers use a one-hour localStorage TTL", () => {
  const source = readFileSync(new URL("../src/lib/terms-client.ts", import.meta.url), "utf8")
  assert.match(source, /localStorage/)
  assert.doesNotMatch(source, /sessionStorage/)
  assert.match(source, /60 \* 60 \* 1000/)
  assert.match(source, /TERMS_ACCEPTED_EVENT/)
})
