import assert from "node:assert/strict"
import { test } from "node:test"

import { acceptListing, listingFieldErrors } from "@/lib/listing-rules"
import type { Listing } from "@/lib/types"

const base = {
  title: "Toyota Corolla 2016",
  price: 8500,
  currency: "KES",
  category: "vehicles" as const,
  subcategoryId: "cars",
  details: { year: "2016", fuel: "Petrol", condition: "Used" },
  country: "KE",
  city: "Nairobi",
  locationDetail: "Westlands, near Sarit Centre",
  latitude: -1.2676,
  longitude: 36.8108,
  locationPrecision: "specific" as const,
  description: "One owner, service history available for viewing this week.",
  phone: "+254712345678",
}

test("listingFieldErrors accepts a valid car ad", () => {
  const errors = listingFieldErrors(base)
  assert.equal(Object.values(errors).filter(Boolean).length, 0)
})

test("listingFieldErrors rejects a short title and weak phone", () => {
  const errors = listingFieldErrors({ ...base, title: "ab", phone: "12" })
  assert.equal(errors.title, "Use at least 4 characters.")
  assert.equal(errors.phone, "Add a phone number people can use.")
})

test("listingFieldErrors keeps listing currencies African and country-aware", () => {
  const errors = listingFieldErrors({ ...base, currency: "USD" })
  assert.match(errors.currency ?? "", /currency for this country/i)
})

test("listingFieldErrors rejects prohibited wording", () => {
  const errors = listingFieldErrors({
    ...base,
    title: "Cocaine for sale nearby",
    description: "Please message quickly if interested in this deal today.",
  })
  assert.match(errors.form ?? "", /prohibited/i)
})

test("acceptListing normalizes sold and trims fields", () => {
  const listing: Listing = {
    id: "ad-test-1",
    title: "  Clean title  ",
    price: 100,
    currency: "KES",
    category: "vehicles",
    subcategory: "cars",
    details: { year: "2016", fuel: "Petrol", condition: "Used" },
    country: "KE",
    city: " Nairobi ",
    locationDetail: "Westlands, near Sarit Centre",
    latitude: -1.2676,
    longitude: 36.8108,
    locationPrecision: "specific",
    hoursAgo: 0,
    image: "/listings/sedan.jpg",
    description: "One owner, service history available for viewing this week.",
    condition: "Used",
    sellerName: "Amina K.",
    sellerSince: "2024",
    phone: " +254712345678 ",
    sold: true,
  }
  const result = acceptListing(listing)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.listing.title, "Clean title")
  assert.equal(result.listing.price, 100)
  assert.equal(result.listing.sold, true)
  assert.equal(result.listing.city, "Nairobi")
})


test("acceptListing keeps direct contact opt-in when flags are omitted", () => {
  const result = acceptListing({
    ...base,
    id: "ad-private-contact",
    subcategory: "cars",
    hoursAgo: 0,
    image: "/listings/sedan.jpg",
    condition: "Used",
    sellerName: "Seller",
    sellerSince: "2026",
  } as Listing)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.listing.contactWhatsApp, false)
  assert.equal(result.listing.contactPhone, false)
})

test("residential housing and job ads require fair-access attestation", () => {
  const property = listingFieldErrors({
    ...base,
    category: "property",
    subcategoryId: "rent",
    details: {},
    fairAccessAttested: false,
  })
  assert.match(property.fairAccess ?? "", /fair-access/i)

  const commercial = listingFieldErrors({
    ...base,
    category: "property",
    subcategoryId: "commercial",
    details: {},
    fairAccessAttested: false,
  })
  assert.equal(commercial.fairAccess, undefined)

  const jobs = listingFieldErrors({
    ...base,
    category: "jobs",
    subcategoryId: "full-time",
    details: {},
    fairAccessAttested: false,
  })
  assert.match(jobs.fairAccess ?? "", /fair-access/i)
})
