export const categories = [
  { id: "vehicles", name: "Vehicles" },
  { id: "property", name: "Property" },
  { id: "electronics", name: "Electronics" },
  { id: "home", name: "Home & garden" },
  { id: "jobs", name: "Jobs" },
  { id: "services", name: "Services" },
  { id: "business", name: "Business & equipment" },
  { id: "agriculture", name: "Agriculture" },
  { id: "fashion", name: "Fashion & beauty" },
  { id: "health", name: "Health & wellness" },
  { id: "education", name: "Education" },
  { id: "community", name: "Community" },
] as const

export type CategoryId = (typeof categories)[number]["id"]

/** ISO 3166-1 alpha-2 code for an African country. */
export type CountryId = string

export const sorts = [
  { id: "relevant", name: "Relevant" },
  { id: "newest", name: "Newest" },
  { id: "price-asc", name: "Price: low to high" },
  { id: "price-desc", name: "Price: high to low" },
] as const

export type SortId = (typeof sorts)[number]["id"]

export type ListingBadge = "featured" | "jobs"

export type Listing = {
  id: string
  title: string
  price: number
  /** ISO 4217 code. Sample ads are USD. */
  currency?: string
  priceSuffix?: string
  category: CategoryId
  /** Subcategory id from the posting plan, for example "cars". */
  subcategory?: string
  /** Answers from the conditional form, keyed by field id. */
  details?: Record<string, string>
  country: CountryId
  city: string
  latitude?: number
  longitude?: number
  /** IANA time zone, for example Africa/Nairobi. */
  timezone?: string
  hoursAgo: number
  postedAt?: string
  image: string
  featured?: boolean
  badge?: ListingBadge
  meta?: string
  description: string
  condition: string
  sellerName: string
  sellerSince: string
  phone: string
  mine?: boolean
}

const categoryIds = new Set<string>(categories.map((category) => category.id))
const sortIds = new Set<string>(sorts.map((sort) => sort.id))

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return !!value && categoryIds.has(value)
}

export function isSortId(value: string | null | undefined): value is SortId {
  return !!value && sortIds.has(value)
}

export function categoryName(id: CategoryId): string {
  const match = categories.find((category) => category.id === id)
  return match ? match.name : id
}
