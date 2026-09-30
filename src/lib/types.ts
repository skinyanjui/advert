import type { ListingStatus } from "@/lib/listing-status"

export const categories = [
  { id: "vehicles", name: "Vehicles" },
  { id: "parts", name: "Vehicle parts" },
  { id: "property", name: "Property" },
  { id: "plots", name: "Plots" },
  { id: "electronics", name: "Electronics" },
  { id: "home", name: "Home & garden" },
  { id: "building", name: "Building materials" },
  { id: "water", name: "Water" },
  { id: "jobs", name: "Jobs" },
  { id: "services", name: "Services" },
  { id: "business", name: "Business & equipment" },
  { id: "agriculture", name: "Agriculture" },
  { id: "livestock", name: "Livestock" },
  { id: "pets", name: "Pets" },
  { id: "babies", name: "Babies & kids" },
  { id: "fashion", name: "Fashion & beauty" },
  { id: "health", name: "Health & wellness" },
  { id: "education", name: "Education" },
  { id: "community", name: "Community" },
] as const

export type CategoryId = (typeof categories)[number]["id"]

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
  /** Extra photos; first entry matches `image` (cover). Legacy ads may omit this. */
  images?: string[]
  featured?: boolean
  /** Seller disclosed a sponsored / paid promotion. */
  sponsored?: boolean
  /** Admin locked sponsored disclosure; seller cannot untick. */
  sponsoredLocked?: boolean
  /** Seller attested that a housing/job listing does not unlawfully discriminate. */
  fairAccessAttested?: boolean
  /** Version of the fair-access attestation applied when the listing was submitted. */
  fairAccessAttestationVersion?: string
  badge?: ListingBadge
  meta?: string
  description: string
  condition: string
  sellerName: string
  sellerSince: string
  /** Public avatar from board_profiles when the seller has one. */
  sellerAvatar?: string
  phone: string
  /** Seller allows buyers to open WhatsApp for this listing. Legacy listings default to true. */
  contactWhatsApp?: boolean
  /** Seller allows buyers to call this listing phone. Legacy listings default to true. */
  contactPhone?: boolean
  /** Owner lifecycle: active | paused | sold | expired (column + effective). */
  status?: ListingStatus
  /** Owner marked the ad as sold; hidden from the main board. */
  sold?: boolean
  /** When the owner marked the ad sold (ISO). */
  soldAt?: string
  /** Moderators hid the ad (reports or admin); dropped from browse. */
  hidden?: boolean
  /** ISO timestamp when the ad leaves browse/search unless renewed. */
  expiresAt?: string
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
