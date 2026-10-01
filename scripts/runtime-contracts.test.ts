import assert from "node:assert/strict"
import { test } from "node:test"

import { cleanListing } from "../src/lib/board-payload"
import { listingPoint } from "../src/lib/distance"
import { acceptListing } from "../src/lib/listing-rules"
import { normalizePostDraft, DRAFT_MAX_AGE_MS } from "../src/lib/post-draft"
import { listingPriceDisplay } from "../src/lib/price-display"
import {
  listingWriteSchema, listingMutationSchema, profilePatchSchema, messageInputSchema,
  readApiInput, countryCodeSchema, currencyCodeSchema, timeZoneSchema,
  privacyRequestInputSchema, termsAcceptanceSchema, complianceIncidentInputSchema,
  complianceIncidentUpdateSchema, moderationAppealInputSchema, privacyRequestReviewSchema,
  reportReviewSchema, accountDeletionSchema, boardImportSchema, whatsappConsentInputSchema,
} from "../src/lib/runtime-contracts"
import { invalidListingCases, validListing } from "./contract-fixtures"

test("malformed JSON and mistyped profile fields return client errors", async () => {
  const malformed = await readApiInput(new Request("https://example.test/api/profile", { method: "PATCH", body: "{" }), profilePatchSchema)
  assert.equal(malformed.ok, false)
  for (const body of [null, [], { city: 42 }, { displayName: {} }, { phone: true }]) {
    const result = await readApiInput(new Request("https://example.test/api/profile", { method: "PATCH", body: JSON.stringify(body) }), profilePatchSchema)
    assert.equal(result.ok, false)
  }
  assert.deepEqual(profilePatchSchema.parse({ city: " Nairobi ", role: "admin" }), { city: "Nairobi" })
})

test("domain identifiers validate countries, currencies and time zones", () => {
  assert.equal(countryCodeSchema.parse("Kenya"), "KE")
  assert.equal(currencyCodeSchema.parse("UGX"), "UGX")
  assert.equal(timeZoneSchema.parse("UTC"), "UTC")
  assert.equal(countryCodeSchema.safeParse("ZZ").success, false)
  assert.equal(currencyCodeSchema.safeParse("ZZZ").success, false)
  assert.equal(timeZoneSchema.safeParse("Imaginary/Zone").success, false)
})

test("full listing edits retain their edit action even with a sold flag", () => {
  const edit = listingMutationSchema.parse({ ...validListing, sold: false, description: "An updated description for this listing." })
  assert.equal(edit.kind, "edit")
  if (edit.kind === "edit") assert.equal(edit.listing.description, "An updated description for this listing.")
  assert.deepEqual(listingMutationSchema.parse({ sold: true }), { kind: "sold", sold: true })
  assert.deepEqual(listingMutationSchema.parse({ paused: false }), { kind: "paused", paused: false })
  assert.deepEqual(listingMutationSchema.parse({ renew: true }), { kind: "renew" })
  assert.equal(listingMutationSchema.safeParse({ sold: true, paused: true }).success, false)
})

test("messages require exactly one valid listing or conversation context", () => {
  const body = "Is this still available?"
  const conversationId = "11111111-1111-4111-8111-111111111111"
  assert.equal(messageInputSchema.safeParse({ body, listingId: validListing.id }).success, true)
  assert.equal(messageInputSchema.safeParse({ body, conversationId }).success, true)
  for (const value of [{ body }, { body, conversationId: "bad-id" }, { body, conversationId, listingId: validListing.id }, { body: "short", listingId: validListing.id }]) {
    assert.equal(messageInputSchema.safeParse(value).success, false)
  }
})

test("privacy and administrative schemas accept the actual form wire shapes", () => {
  const id = "11111111-1111-4111-8111-111111111111"
  assert.equal(privacyRequestInputSchema.safeParse({ email: "member@example.test", actingAsAgent: false, subjectEmail: null, jurisdiction: "kenya", requestType: "access", details: "", locale: null }).success, true)
  assert.equal(termsAcceptanceSchema.safeParse({ context: "reaccept", ageAttested: true, privacyAcknowledged: true, locale: "sw" }).success, true)
  assert.equal(termsAcceptanceSchema.safeParse({ context: "signup", ageAttested: false, privacyAcknowledged: true }).success, false)
  const incident = complianceIncidentInputSchema.parse({ title: "Incident", severity: "high", discoveredAt: "2026-10-01T14:30", description: "Observed facts", affectedPeopleEstimate: null, jurisdictions: ["Kenya"], personalDataInvolved: true, sensitiveDataInvolved: false })
  assert.ok(incident.discoveredAt.endsWith("Z"))
  assert.equal(complianceIncidentUpdateSchema.safeParse({ incidentId: id, action: "assess", assessment: "Known facts", regulatorNotificationRequired: null, userNotificationRequired: false }).success, true)
  assert.equal(moderationAppealInputSchema.safeParse({ moderationActionId: id, reason: "Please reconsider." }).success, true)
  assert.equal(privacyRequestReviewSchema.safeParse({ requestId: id, action: "complete", resolution: "" }).success, false)
  assert.equal(reportReviewSchema.safeParse({ reportId: id, action: "hide", decisionReason: null }).success, false)
  assert.equal(accountDeletionSchema.safeParse({ confirm: "DELETE" }).success, true)
  assert.equal(accountDeletionSchema.safeParse({ confirm: true }).success, false)
  assert.equal(whatsappConsentInputSchema.safeParse({ listingId: "sample-1" }).success, false)
  assert.deepEqual(boardImportSchema.parse({ savedIds: ["sample-1"] }), { posted: [], savedIds: ["sample-1"] })
})

test("all account and moderation write schemas reject null instead of crashing", async () => {
  for (const schema of [privacyRequestInputSchema, termsAcceptanceSchema, complianceIncidentInputSchema, complianceIncidentUpdateSchema, moderationAppealInputSchema, privacyRequestReviewSchema, reportReviewSchema, accountDeletionSchema, boardImportSchema, whatsappConsentInputSchema]) {
    const parsed = await readApiInput(new Request("https://example.test/api", { method: "POST", body: "null" }), schema)
    assert.equal(parsed.ok, false)
  }
})

test("listing request and domain validation agree on bounded whole-unit writes", () => {
  assert.equal(listingWriteSchema.safeParse(validListing).success, true)
  assert.equal(acceptListing(validListing).ok, true)
  for (const fixture of invalidListingCases) {
    const candidate = { ...validListing, ...fixture.patch }
    const wire = listingWriteSchema.safeParse(candidate)
    const accepted = wire.success ? acceptListing(wire.data) : { ok: false }
    assert.equal(accepted.ok, false, fixture.name)
  }
  assert.equal(cleanListing({ ...validListing, latitude: 100 }), undefined)
})

test("typed unknown towns never receive a country-centre pin or distance", () => {
  assert.equal(listingPoint({ country: "KE", city: "Unlisted pickup town" }), null)
  assert.ok(listingPoint({ country: "KE", city: "Nairobi" }))
  assert.deepEqual(listingPoint({ country: "KE", city: "Unlisted pickup town", latitude: -1.25, longitude: 36.75 }), { lat: -1.25, lng: 36.75 })
  assert.equal(acceptListing({ ...validListing, city: "Unlisted pickup town" }).ok, true)
})

const draft = {
  flowVersion: 3, step: 2, category: "vehicles", subcategoryId: "cars", title: validListing.title,
  price: "850000", period: "fixed", details: validListing.details, country: "KE", currency: "KES",
  city: "Nairobi", locationDetail: "Public pickup point", locationPrecision: "specific",
  latitude: -1.25, longitude: 36.75, timezone: "Africa/Nairobi", description: validListing.description,
  phone: "", photos: [], savedAt: 1000,
}

test("draft recovery preserves a specific pin and discards malformed coordinates", () => {
  const restored = normalizePostDraft(draft, 1100)
  assert.equal(restored?.latitude, draft.latitude)
  assert.equal(restored?.longitude, draft.longitude)
  assert.equal(restored?.locationPrecision, "specific")
  assert.equal(restored?.locationDetail, draft.locationDetail)
  const invalid = normalizePostDraft({ ...draft, latitude: 100 }, 1100)
  assert.equal(invalid?.title, draft.title)
  assert.equal(invalid?.latitude, undefined)
  assert.equal(invalid?.locationPrecision, "city")
  assert.equal(normalizePostDraft({ ...draft, details: 42 }, 1100), null)
  assert.equal(normalizePostDraft(draft, 1001 + DRAFT_MAX_AGE_MS), null)
  assert.equal(normalizePostDraft({ ...draft, flowVersion: 2, step: 1 }, 1100)?.step, 2)
})

test("Uganda market shows one UGX price without rewriting the seller price", () => {
  const original = { price: 100, currency: "KES", country: "KE" }
  const result = listingPriceDisplay(original, { currency: "listing", marketCountry: "UG", rates: { base: "USD", rates: { KES: 100, UGX: 3700 }, fetchedAt: "2026-10-01" } })
  assert.equal(result.currency, "UGX")
  assert.equal(result.approximate, true)
  assert.ok(result.primary.startsWith("≈ "))
  assert.equal("secondary" in result, false)
  assert.equal(original.price, 100)
  assert.equal(original.currency, "KES")
  const unavailable = listingPriceDisplay(original, { currency: "listing", marketCountry: "UG" })
  assert.equal(unavailable.currency, "KES")
  assert.equal(unavailable.conversionUnavailable, true)
  assert.equal(unavailable.approximate, false)
  const override = listingPriceDisplay(original, { currency: "KES", marketCountry: "UG" })
  assert.equal(override.currency, "KES")
})
