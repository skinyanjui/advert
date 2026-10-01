import type { Listing } from "../src/lib/types"

export const validListing: Listing = {
  id: "ad-contract-fixture",
  title: "Toyota Corolla 2016",
  price: 850000,
  currency: "KES",
  category: "vehicles",
  subcategory: "cars",
  taxonomyVersion: 1,
  details: { year: "2016", fuel: "fuel:petrol", condition: "condition:used" },
  country: "KE",
  city: "Nairobi",
  locationDetail: "Westlands pickup point",
  hoursAgo: 0,
  image: "/listings/sedan.jpg",
  images: ["/listings/sedan.jpg"],
  description: "One owner, service history available for viewing this week.",
  condition: "Used",
  sellerName: "Seller",
  sellerSince: "2026",
  phone: "",
  contactWhatsApp: false,
  contactPhone: false,
}

/** These invalid payloads must fail both domain validation and the DB contract. */
export const invalidListingCases = [
  { name: "fractional price", patch: { price: 100.4 } },
  { name: "zero price", patch: { price: 0 } },
  { name: "over-limit price", patch: { price: 1_000_000_000 } },
  { name: "missing location text", patch: { locationDetail: undefined } },
  { name: "over-limit location text", patch: { locationDetail: "x".repeat(121) } },
  { name: "wrong country currency", patch: { currency: "UGX" } },
  { name: "partial coordinates", patch: { latitude: -1.2 } },
  { name: "invalid coordinates", patch: { latitude: 91, longitude: 36.8 } },
  { name: "specific precision without pin", patch: { locationPrecision: "specific" as const } },
  { name: "unknown subcategory", patch: { subcategory: "not-a-type" } },
  { name: "missing required details", patch: { details: {} } },
  { name: "unknown option code", patch: { details: { ...validListing.details, fuel: "fuel:made-up" } } },
] as const
