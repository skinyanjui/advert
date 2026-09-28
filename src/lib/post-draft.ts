import type { CategoryId } from "@/lib/types"
import type { PricePeriodId } from "@/lib/posting"

const DRAFT_KEY = "advert:post-draft:v1"

export type PostDraft = {
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
  photos: string[]
  savedAt: number
}

export function readPostDraft(): PostDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PostDraft
    if (!parsed || typeof parsed !== "object") return null
    return parsed
  } catch {
    return null
  }
}

export function writePostDraft(draft: Omit<PostDraft, "savedAt">): void {
  if (typeof window === "undefined") return
  try {
    const payload: PostDraft = { ...draft, savedAt: Date.now() }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  } catch {
    // Quota / private mode — posting still works without a draft.
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
