import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { test } from "node:test"

import cities from "../src/data/cities.json"
import { categories, currentTaxonomyVersion } from "../src/lib/category-registry"
import { contactMethods } from "../src/lib/contact-methods"
import { contactEventTypes } from "../src/lib/contact-event-types"
import { countries } from "../src/lib/countries"
import { currencyRegistry } from "../src/lib/currency-registry"
import { listingStatuses } from "../src/lib/listing-status"
import { marketplacePolicy } from "../src/lib/marketplace-policy"
import { detailFieldOptions, postingPlans } from "../src/lib/posting"
import { referenceSnapshotMetadata } from "../src/lib/reference-manifest"
import { profilePatchFromUnknown } from "../src/lib/runtime-contracts"
import { referenceCountrySchema, referenceCitySchema } from "../src/lib/reference-contracts"
import referenceManifest from "../src/data/reference-manifest.json"
import taxonomy from "../src/data/taxonomy-v1.json"
import countrySnapshot from "../src/data/countries.json"

test("category registry is unique and every category has one posting plan and translation key", () => {
  assert.equal(new Set(categories.map((item) => item.id)).size, categories.length)
  const plans = postingPlans()
  assert.equal(plans.length, categories.length)
  for (const category of categories) {
    assert.ok(plans.some((plan) => plan.id === category.id), `missing posting plan: ${category.id}`)
    for (const locale of ["en", "fr", "sw"]) {
      const source = readFileSync(new URL(`../src/lib/i18n/messages/${locale}.ts`, import.meta.url), "utf8")
      assert.ok(source.includes(`"${category.labelKey}"`), `missing ${locale} translation: ${category.labelKey}`)
    }
  }
})

test("reference relations are internally consistent", () => {
  assert.equal(new Set(countries.map((item) => item.code)).size, countries.length)
  assert.equal(new Set(countries.map((item) => item.alpha3)).size, countries.length)
  const numeric = countries.map((item) => item.numeric).filter(Boolean)
  assert.equal(new Set(numeric).size, numeric.length)
  const countryCodes = new Set(countries.map((item) => item.code))
  for (const country of countries) {
    assert.match(country.code, /^[A-Z]{2}$/)
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: country.timezone }).format())
  }
  for (const city of cities) {
    assert.ok(countryCodes.has(city.country), `unknown city country: ${city.country}`)
    assert.ok(city.pop >= 15000)
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: city.tz }).format())
  }
  const currencies = currencyRegistry()
  assert.equal(new Set(currencies.map((item) => item.code)).size, currencies.length)
  for (const currency of currencies) assert.match(currency.code, /^[A-Z]{3}$/)
})

test("database lifecycle and contact constraints match code registries", () => {
  const lifecycle = readFileSync(new URL("../database/migrations/20260928_listing_status.sql", import.meta.url), "utf8")
  for (const status of listingStatuses) assert.ok(lifecycle.includes(`'${status}'`))
  const events = new Set<string>(contactEventTypes)
  for (const method of Object.values(contactMethods)) {
    assert.ok(events.has(method.analyticsEvent), `missing analytics event for ${method.id}`)
  }
})

test("marketplace policy owns stable listing and photo limits", () => {
  assert.equal(marketplacePolicy.listing.lifetimeDays, 60)
  assert.equal(marketplacePolicy.photos.maxCount, 6)
  assert.match(readFileSync(new URL("../src/lib/expiry.ts", import.meta.url), "utf8"), /marketplacePolicy\.listing/)
  assert.match(readFileSync(new URL("../src/lib/photos.ts", import.meta.url), "utf8"), /marketplacePolicy\.photos/)
})

test("reference snapshots expose provenance hashes", () => {
  for (const dataset of ["countries", "cities"] as const) {
    const meta = referenceSnapshotMetadata(dataset)
    assert.match(meta.version, /^[a-f0-9]{64}$/)
    assert.ok(meta.sourceUrl.startsWith("https://"))
    assert.ok(meta.license.length > 0)
    assert.ok(meta.recordCount > 0)
    assert.equal(meta.contentHash, referenceManifest[dataset].contentHash)
    assert.equal(meta.recordCount, referenceManifest[dataset].recordCount)
  }
})

test("every reference snapshot row satisfies the wire and sync contract", () => {
  for (const row of countrySnapshot) assert.equal(referenceCountrySchema.safeParse(row).success, true, row.code)
  for (const row of cities) assert.equal(referenceCitySchema.safeParse(row).success, true, String(row.id))
})

test("taxonomy identity matches the frozen version and database validator", () => {
  const identity = Object.fromEntries(postingPlans().map((plan) => [plan.id, Object.fromEntries(plan.subcategories.map((sub) => [sub.id, Object.fromEntries(sub.fields.map((field) => [field.id, {
    required: field.required === true,
    options: field.kind === "select" ? detailFieldOptions(field).map((option) => option.id) : null,
  }]))]))]))
  assert.equal(taxonomy.version, currentTaxonomyVersion)
  assert.deepEqual(identity, taxonomy.categories, "Identity changes need a new taxonomy version and migration")
  assert.equal(createHash("sha256").update(JSON.stringify(identity)).digest("hex"), taxonomy.hash)
  const migration = readFileSync(new URL("../supabase/migrations/20261001213348_authority_contracts.sql", import.meta.url), "utf8")
  const frozen = migration.match(/catalog constant jsonb := '(.+)'::jsonb;/)?.[1]
  assert.ok(frozen)
  assert.deepEqual(JSON.parse(frozen.replaceAll("''", "'")), taxonomy.categories)
  assert.ok(migration.includes(taxonomy.hash))
})

test("runtime contracts preserve stable IDs independently from labels", () => {
  const field = postingPlans()[0].subcategories[0].fields.find((field) => field.id === "fuel")!
  const relabelled = { ...field, options: field.options!.map((option) => ({ ...option, label: `Translated ${option.label}` })) }
  assert.deepEqual(detailFieldOptions(relabelled).map((option) => option.id), detailFieldOptions(field).map((option) => option.id))
  assert.deepEqual(profilePatchFromUnknown({ countryCode: "KE", city: "Nairobi", extra: 1 }), {
    countryCode: "KE",
    city: "Nairobi",
  })
})

test("listing cards do not show buyer distance; details do", () => {
  const card = readFileSync(new URL("../src/components/listing-card.tsx", import.meta.url), "utf8")
  const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(card, /distanceKm|formatDistance/)
  assert.match(detail, /distanceAway/)
  assert.match(detail, /formatDistance/)
  assert.match(detail, /locationDetail/)
})

test("promotion fields, package and consent version share their authoritative owners", async () => {
  const { listingRecordSchema, promotionCheckoutSchema, promotionDecisionSchema } = await import("../src/lib/runtime-contracts")
  const { promotionStatuses, promotionEventTypes } = await import("../src/lib/promotions")
  const { policyVersions } = await import("../src/lib/policy-versions")
  const sql = readFileSync(new URL("../database/migrations/20261002_featured_promotions.sql", import.meta.url), "utf8")
  for (const status of promotionStatuses) assert.ok(sql.includes(`'${status}'`))
  for (const event of promotionEventTypes) assert.ok(sql.includes(`'${event}'`))
  for (const field of ["featured", "featuredUntil", "featuredPaid", "featuredPromotionId"]) assert.ok(field in listingRecordSchema.shape)
  assert.ok(sql.includes(`'${policyVersions.featuredPlacementTerms}'`))
  assert.ok(sql.includes(`1000, ${marketplacePolicy.promotions.days}`))
  assert.ok(sql.includes(`default '${marketplacePolicy.promotions.currency}'`))
  assert.equal(marketplacePolicy.promotions.amount, 1000)
  assert.equal(promotionCheckoutSchema.safeParse({ listingId: "ad-test", acceptTerms: false }).success, false)
  assert.equal(promotionDecisionSchema.safeParse({ action: "grant", listingId: "ad-test", days: marketplacePolicy.promotions.maxGrantDays + 1, reason: "Reason" }).success, false)
  assert.equal(promotionDecisionSchema.safeParse({ action: "approve", id: "not-a-uuid", reason: "Reason" }).success, false)
  assert.equal(promotionDecisionSchema.safeParse(null).success, false)
})


test("promotion operational kinds, delivery states, review and retry policy match the database", async () => {
  const { promotionNotificationKinds, promotionNotificationStatuses } = await import("../src/lib/promotions")
  const sql = readFileSync(new URL("../database/migrations/20261002_promotion_operations.sql", import.meta.url), "utf8")
  for (const value of [...promotionNotificationKinds, ...promotionNotificationStatuses]) assert.ok(sql.includes(`'${value}'`))
  assert.ok(sql.includes(`interval '${marketplacePolicy.promotions.reviewHours} hours'`))
  assert.ok(sql.includes(`refund_attempts < ${marketplacePolicy.promotions.maxRefundAttempts}`))
  assert.ok(sql.includes(`attempts < ${marketplacePolicy.promotions.maxNotificationAttempts}`))
})

test("support verification and lead retention SQL match shared policy", () => {
  const support = readFileSync(new URL("../database/migrations/20261002_payment_support.sql", import.meta.url), "utf8")
  assert.ok(support.includes(`interval '${marketplacePolicy.paymentSupport.resendSeconds} seconds'`))
  assert.ok(support.includes(`interval '${marketplacePolicy.paymentSupport.challengeMinutes} minutes'`))
  const leads = readFileSync(new URL("../database/migrations/20261002_seller_contact_leads.sql", import.meta.url), "utf8")
  assert.ok(leads.includes(`interval '${marketplacePolicy.contactAnalytics.retentionDays} days'`))
  for (const value of contactEventTypes) assert.ok(leads.includes(`'${value}'`))
})
