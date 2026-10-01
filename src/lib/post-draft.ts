import type { CategoryId } from "@/lib/types"
import type { PricePeriodId } from "@/lib/posting"
import { pricePeriods } from "@/lib/posting"
import { categories } from "@/lib/category-registry"
import { isGeoPoint } from "@/lib/distance"
import { timeZoneId } from "@/lib/domain-ids"
import { marketplacePolicy } from "@/lib/marketplace-policy"
import { policyVersions } from "@/lib/policy-versions"
import { z } from "zod"

const DRAFT_KEY = "advert:post-draft:v1"
const FLOW_VERSION = policyVersions.postingFlow
export const DRAFT_MAX_AGE_MS = marketplacePolicy.drafts.maxAgeDays * 24 * 60 * 60 * 1000

export type PostDraft = {
  flowVersion?: 2 | 3
  step: number
  category: CategoryId | null
  subcategoryId: string | null
  title: string
  price: string
  period: PricePeriodId
  details: Record<string, string>
  country: string
  currency: string
  city: string
  locationDetail?: string
  locationPrecision?: "city" | "specific"
  latitude?: number
  longitude?: number
  timezone?: string
  description: string
  phone: string
  contactWhatsApp?: boolean
  contactPhone?: boolean
  photos: string[]
  sponsored?: boolean
  fairAccessAttested?: boolean
  savedAt: number
}

export type WritePostDraftResult =
  | { ok: true; omittedPhotos?: boolean }
  | { ok: false }

const draftSchema = z.object({
  flowVersion: z.number().int().optional(),
  step: z.number().int().nonnegative(),
  category: z.enum(categories.map((category) => category.id)).nullable(),
  subcategoryId: z.string().nullable(),
  title: z.string(),
  price: z.string(),
  period: z.enum(pricePeriods.map((period) => period.id)),
  details: z.record(z.string(), z.string()),
  country: z.string(),
  currency: z.string(),
  city: z.string(),
  locationDetail: z.string().optional(),
  locationPrecision: z.enum(["city", "specific"]).optional(),
  latitude: z.unknown().optional(),
  longitude: z.unknown().optional(),
  timezone: z.unknown().optional(),
  description: z.string(),
  phone: z.string(),
  contactWhatsApp: z.boolean().optional(),
  contactPhone: z.boolean().optional(),
  photos: z.array(z.string()).max(marketplacePolicy.photos.maxCount),
  sponsored: z.boolean().optional(),
  fairAccessAttested: z.boolean().optional(),
  savedAt: z.number().finite().nonnegative(),
})

/** Preserve draft content while discarding malformed or incomplete saved pins. */
export function normalizePostDraft(value: unknown, now = Date.now()): PostDraft | null {
  const result = draftSchema.safeParse(value)
  if (!result.success || isPostDraftExpired(result.data.savedAt, now)) return null
  const parsed = result.data
  const step = parsed.flowVersion === FLOW_VERSION
    ? Math.min(3, parsed.step)
    : parsed.step >= 2
      ? 3
      : parsed.step >= 1 || parsed.subcategoryId
        ? 2
        : parsed.category ? 1 : 0
  const zone = typeof parsed.timezone === "string" ? timeZoneId(parsed.timezone) : null
  const hasPin = isGeoPoint(parsed.latitude, parsed.longitude) && !!zone
  return {
    ...parsed,
    flowVersion: FLOW_VERSION,
    step,
    latitude: hasPin ? parsed.latitude as number : undefined,
    longitude: hasPin ? parsed.longitude as number : undefined,
    timezone: hasPin ? zone! : undefined,
    locationPrecision: hasPin ? parsed.locationPrecision : "city",
  }
}

export function readPostDraft(now = Date.now()): PostDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = normalizePostDraft(JSON.parse(raw), now)
    if (!parsed) {
      clearPostDraft()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writePostDraft(draft: Omit<PostDraft, "savedAt" | "flowVersion">): WritePostDraftResult {
  if (typeof window === "undefined") return { ok: false }
  const savedAt = Date.now()
  try {
    const payload: PostDraft = { ...draft, flowVersion: FLOW_VERSION, savedAt }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    return { ok: true }
  } catch {
    if (draft.photos.length === 0) return { ok: false }
    try {
      const withoutPhotos: PostDraft = { ...draft, photos: [], flowVersion: FLOW_VERSION, savedAt }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(withoutPhotos))
      return { ok: true, omittedPhotos: true }
    } catch {
      return { ok: false }
    }
  }
}

export function clearPostDraft(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

/** Test helper: age check without touching localStorage. */
export function isPostDraftExpired(savedAt: number, now = Date.now()): boolean {
  return now - savedAt > DRAFT_MAX_AGE_MS
}
