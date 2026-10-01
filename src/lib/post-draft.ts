import type { CategoryId } from "@/lib/types"
import type { PricePeriodId } from "@/lib/posting"

const DRAFT_KEY = "advert:post-draft:v1"
const FLOW_VERSION = 3 as const
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

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

export function readPostDraft(now = Date.now()): PostDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PostDraft
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.savedAt === "number" && now - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      clearPostDraft()
      return null
    }
    const legacyStep = parsed.step
    // v2 combined category and type in step 0. Keep the user's selections while
    // placing old drafts at the equivalent point in the new four-step flow.
    const step = parsed.flowVersion === FLOW_VERSION
      ? Math.min(3, Math.max(0, legacyStep))
      : legacyStep >= 2
        ? 3
        : legacyStep >= 1 || parsed.subcategoryId
          ? 2
          : parsed.category
            ? 1
            : 0
    return { ...parsed, flowVersion: FLOW_VERSION, step }
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
