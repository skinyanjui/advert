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

export const countries = [
  { id: "kenya", name: "Kenya", primary: true },
  { id: "tanzania", name: "Tanzania", primary: true },
  { id: "uganda", name: "Uganda", primary: true },
  { id: "rwanda", name: "Rwanda", primary: true },
  { id: "ethiopia", name: "Ethiopia", primary: true },
  { id: "south-africa", name: "South Africa", primary: true },
  { id: "ghana", name: "Ghana", primary: true },
  { id: "nigeria", name: "Nigeria", primary: true },
  { id: "zambia", name: "Zambia", primary: true },
  { id: "botswana", name: "Botswana", primary: false },
  { id: "namibia", name: "Namibia", primary: false },
  { id: "mozambique", name: "Mozambique", primary: false },
  { id: "senegal", name: "Senegal", primary: false },
  { id: "cote-divoire", name: "Côte d'Ivoire", primary: false },
  { id: "cameroon", name: "Cameroon", primary: false },
  { id: "morocco", name: "Morocco", primary: false },
  { id: "egypt", name: "Egypt", primary: false },
  { id: "malawi", name: "Malawi", primary: false },
  { id: "angola", name: "Angola", primary: false },
] as const

export type CountryId = (typeof countries)[number]["id"]

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
  priceSuffix?: string
  category: CategoryId
  country: CountryId
  city: string
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
const countryIds = new Set<string>(countries.map((country) => country.id))
const sortIds = new Set<string>(sorts.map((sort) => sort.id))

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return !!value && categoryIds.has(value)
}

export function isCountryId(value: string | null | undefined): value is CountryId {
  return !!value && countryIds.has(value)
}

export function isSortId(value: string | null | undefined): value is SortId {
  return !!value && sortIds.has(value)
}

export function categoryName(id: CategoryId): string {
  const match = categories.find((category) => category.id === id)
  return match ? match.name : id
}

export function countryName(id: CountryId): string {
  const match = countries.find((country) => country.id === id)
  return match ? match.name : id
}
