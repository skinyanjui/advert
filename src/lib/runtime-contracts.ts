import { z } from "zod"
import { locales } from "@/lib/i18n/locales"
import { promotionStatuses, promotionEventTypes } from "@/lib/promotions"

import { categories, currentTaxonomyVersion } from "@/lib/category-registry"
import { contactEventTypes } from "@/lib/contact-event-types"
import { countryCode, currencyCode, timeZoneId } from "@/lib/domain-ids"
import { listingStatuses } from "@/lib/listing-status"
import { marketplacePolicy } from "@/lib/marketplace-policy"
import { reportReasons } from "@/lib/reports"
import { privacyJurisdictions, privacyRequestTypes } from "@/lib/privacy-rights"
import { complianceIncidentSeverities } from "@/lib/compliance-incident-types"\nimport { supportCategories } from "@/lib/support"\nimport { TERMS_ACCEPTANCE_CONTEXTS } from "@/lib/legal"

const limits = marketplacePolicy.listing
export const listingIdSchema = z.string().regex(/^ad-[a-zA-Z0-9-]{1,64}$/, "Choose a real listing.")
export const countryCodeSchema = z.string().transform((value, context) => {
  const code = countryCode(value)
  if (code) return code
  context.addIssue({ code: "custom", message: "Choose a valid country." })
  return z.NEVER
})
export const currencyCodeSchema = z.string().transform((value, context) => {
  const code = currencyCode(value)
  if (code) return code
  context.addIssue({ code: "custom", message: "Choose a valid currency." })
  return z.NEVER
})
export const timeZoneSchema = z.string().transform((value, context) => {
  const zone = timeZoneId(value)
  if (zone) return zone
  context.addIssue({ code: "custom", message: "Choose a valid time zone." })
  return z.NEVER
})

/** Shared wire model. Stored legacy rows may omit optional fields. */
export const listingRecordSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string(),
  price: z.number().finite(),
  currency: z.string().optional(),
  priceSuffix: z.string().optional(),
  category: z.enum(categories.map((category) => category.id)),
  subcategory: z.string().optional(),
  taxonomyVersion: z.number().int().positive().optional(),
  details: z.record(z.string(), z.string()).optional(),
  country: z.string(),
  city: z.string(),
  locationDetail: z.string().optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  locationPrecision: z.enum(["city", "specific"]).optional(),
  timezone: z.string().optional(),
  hoursAgo: z.number().finite(),
  postedAt: z.string().optional(),
  image: z.string(),
  images: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  featuredUntil: z.string().optional(),
  featuredPaid: z.boolean().optional(),
  featuredPromotionId: z.string().uuid().optional(),
  sponsored: z.boolean().optional(),
  sponsoredLocked: z.boolean().optional(),
  fairAccessAttested: z.boolean().optional(),
  fairAccessAttestationVersion: z.string().optional(),
  badge: z.enum(["featured", "jobs"]).optional(),
  meta: z.string().optional(),
  description: z.string(),
  condition: z.string(),
  sellerName: z.string(),
  sellerSince: z.string().default(""),
  sellerAvatar: z.string().optional(),
  phone: z.string(),
  contactWhatsApp: z.boolean().optional(),
  contactPhone: z.boolean().optional(),
  status: z.enum(listingStatuses).optional(),
  sold: z.boolean().optional(),
  soldAt: z.string().optional(),
  hidden: z.boolean().optional(),
  expiresAt: z.string().optional(),
  mine: z.boolean().optional(),
})
export type ListingRecord = z.output<typeof listingRecordSchema>

export const listingWriteSchema = listingRecordSchema.extend({
  id: listingIdSchema,
  title: z.string().trim().min(4).max(limits.maxTitleLength),
  price: z.number().int().positive().max(limits.maxPrice),
  country: countryCodeSchema,
  currency: currencyCodeSchema.optional(),
  city: z.string().trim().min(2).max(limits.maxCityLength),
  locationDetail: z.string().trim().min(2).max(limits.maxLocationDetailLength),
  description: z.string().trim().min(20).max(limits.maxDescriptionLength),
  details: z.record(z.string().max(80), z.string().max(limits.maxDetailValueLength)).optional(),
  timezone: timeZoneSchema.optional(),
  taxonomyVersion: z.literal(currentTaxonomyVersion).optional(),
  images: z.array(z.string()).max(marketplacePolicy.photos.maxCount).optional(),
})
export type ListingWriteInput = z.input<typeof listingWriteSchema>

export const profilePatchSchema = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(limits.maxCityLength).nullable().optional(),
  countryCode: z.string().max(80).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  language: z.string().max(12).nullable().optional(),
  currency: z.string().max(12).nullable().optional(),
})
export type ProfilePatchInput = z.infer<typeof profilePatchSchema>

export function profilePatchFromUnknown(value: unknown): ProfilePatchInput {
  return profilePatchSchema.parse(value)
}

const conversationIdSchema = z.string().uuid("Choose a valid conversation.")
export const messageInputSchema = z.object({
  listingId: z.string().min(1).max(80).optional(),
  conversationId: conversationIdSchema.optional(),
  body: z.string().trim().min(8, "Write at least 8 characters.").max(1000, "Use a shorter message."),
}).refine((input) => Boolean(input.listingId) !== Boolean(input.conversationId), {
  message: "Choose a listing or conversation.",
})
export type MessageInput = z.infer<typeof messageInputSchema>
export const messageReadSchema = z.object({ conversationId: conversationIdSchema })
export const saveInputSchema = z.object({ listingId: z.string().min(1).max(80) })
export const contactEventSchema = z.object({ listingId: listingIdSchema, eventType: z.enum(contactEventTypes) })
export const reportInputSchema = z.object({
  listingId: listingIdSchema,
  reason: z.enum(reportReasons.map((reason) => reason.id)),
  note: z.string().trim().max(500).default(""),
  legalBasis: z.string().trim().max(1500).default(""),
  jurisdiction: z.string().trim().max(120).default(""),
  goodFaith: z.boolean().default(false),
})
export type ReportInput = z.infer<typeof reportInputSchema>

export const listingMutationSchema = z.union([
  z.object({ sold: z.boolean(), resumeTo: z.enum(["active", "paused"]).optional() }).strict()
    .transform((value) => ({ kind: "sold" as const, ...value })),
  z.object({ paused: z.boolean() }).strict()
    .transform((value) => ({ kind: "paused" as const, ...value })),
  z.object({ renew: z.literal(true) }).strict()
    .transform(() => ({ kind: "renew" as const })),
  listingWriteSchema.transform((listing) => ({ kind: "edit" as const, listing })),
])
export type ListingMutationInput = z.output<typeof listingMutationSchema>

export const accountDeletionSchema = z.object({ confirm: z.literal("DELETE", "Type DELETE to confirm account deletion.") })
export const termsAcceptanceSchema = z.object({
  context: z.enum(TERMS_ACCEPTANCE_CONTEXTS).default("signup"),
  ageAttested: z.literal(true, "Confirm that you meet the account age requirement."),
  privacyAcknowledged: z.literal(true, "Acknowledge the Privacy Policy to continue."),
  locale: z.string().max(16).nullable().optional(),
})
export const supportRequestSchema = z.object({
  category: z.enum(supportCategories),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  message: z.string().trim().min(10, "Tell us a little more so support can investigate.").max(4000),
  website: z.string().max(200).optional().default(""),
})

export const whatsappConsentInputSchema = z.object({ listingId: listingIdSchema })
export const boardImportSchema = z.object({
  posted: z.array(listingRecordSchema).max(40).default([]),
  savedIds: z.array(z.string().min(1).max(80)).max(200).default([]),
})
export const privacyRequestInputSchema = z.object({
  email: z.string().trim().max(320).optional(),
  subjectEmail: z.string().trim().max(320).nullable().optional(),
  actingAsAgent: z.boolean().default(false),
  jurisdiction: z.enum(privacyJurisdictions.map((item) => item.id)),
  requestType: z.enum(privacyRequestTypes.map((item) => item.id)),
  details: z.string().trim().max(1500).optional(),
  locale: z.string().max(16).nullable().optional(),
})
export const moderationAppealInputSchema = z.object({
  moderationActionId: z.string().uuid(),
  reason: z.string().trim().min(10).max(2500),
})
export const moderationAppealReviewSchema = z.object({
  appealId: z.string().uuid(),
  outcome: z.enum(["uphold", "reverse"]),
  resolution: z.string().trim().min(1).max(2500),
})
export const reportReviewSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["dismiss", "hide", "remove", "mark_sponsored"]),
  decisionReason: z.string().trim().max(1500).nullable().optional(),
}).refine((value) => !["hide", "remove"].includes(value.action) || !!value.decisionReason, {
  message: "Add a clear reason before restricting this listing.", path: ["decisionReason"],
})
export const privacyRequestReviewSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["verify", "start", "complete", "deny"]),
  resolution: z.string().trim().max(2500).nullable().optional(),
}).refine((value) => !["complete", "deny"].includes(value.action) || !!value.resolution, {
  message: "Add a resolution note before completing or denying a request.", path: ["resolution"],
})
export const complianceIncidentInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  severity: z.enum(complianceIncidentSeverities),
  discoveredAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "Enter when the incident was discovered.")
    .transform((value) => new Date(value).toISOString()),
  personalDataInvolved: z.boolean().default(false),
  sensitiveDataInvolved: z.boolean().default(false),
  affectedPeopleEstimate: z.number().int().nonnegative().nullable().default(null),
  jurisdictions: z.array(z.string().max(80)).max(30).default([]),
  description: z.string().trim().min(1).max(5000),
})
export const complianceIncidentUpdateSchema = z.object({
  incidentId: z.string().uuid(),
  action: z.enum(["investigate", "contain", "assess", "regulator_notified", "users_notified", "close"]),
  assessment: z.string().max(5000).nullable().optional(),
  regulatorNotificationRequired: z.boolean().nullable().optional(),
  userNotificationRequired: z.boolean().nullable().optional(),
})

/** Invalid JSON and invalid field types are client errors, never database failures. */
export async function readApiInput<S extends z.ZodType>(request: Request, schema: S): Promise<
  { ok: true; value: z.output<S> } | { ok: false; reason: string }
> {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    return { ok: false, reason: "Send a valid JSON object." }
  }
  const parsed = schema.safeParse(value)
  if (parsed.success) return { ok: true, value: parsed.data }
  const issue = parsed.error.issues[0]
  const field = issue?.path.join(".")
  return { ok: false, reason: field ? `${field}: ${issue.message}` : issue?.message ?? "Check the request fields." }
}

const promotionIdSchema = z.string().uuid("Choose a promotion.")
const promotionReasonSchema = z.string().trim().min(3).max(1500)
export const promotionCheckoutSchema = z.object({ listingId: listingIdSchema, acceptTerms: z.literal(true), language: z.enum(locales).default("en") })
export const promotionEventSchema = z.object({ promotionId: promotionIdSchema, type: z.enum(promotionEventTypes) })
export const promotionListSchema = z.object({ page: z.coerce.number().int().min(0).max(100000).default(0), status: z.enum(["all", ...promotionStatuses]).default("all") })
export const promotionDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), listingId: listingIdSchema, days: z.number().int().min(1).max(marketplacePolicy.promotions.maxGrantDays), reason: promotionReasonSchema }),
  z.object({ action: z.enum(["approve", "reject", "remove"]), id: promotionIdSchema, reason: promotionReasonSchema }),
  z.object({ action: z.literal("retry_refund"), id: promotionIdSchema }),
])
