import { categories, categoryName, isCategoryId, type CategoryId } from "@/lib/category-registry"
import type { ListingStatus } from "@/lib/listing-status"

export { categories, categoryName, isCategoryId }
export type { CategoryId }

/** ISO 3166-1 alpha-2 code for an African country. */
export type CountryId = string

export const sorts = [
  { id: "relevant", name: "Best match", hint: "Recommended for you" },
  { id: "newest", name: "Newest", hint: "Just posted" },
  { id: "price-asc", name: "Lowest price", hint: "Cheap first" },
  { id: "price-desc", name: "Highest price", hint: "Pricey first" },
] as const

export type SortId = (typeof sorts)[number]["id"]

export type ListingBadge = "featured" | "jobs"

export type { ListingStatus }

export type Listing = import("@/lib/runtime-contracts").ListingRecord

const sortIds = new Set<string>(sorts.map((sort) => sort.id))

export function isSortId(value: string | null | undefined): value is SortId {
  return !!value && sortIds.has(value)
}

