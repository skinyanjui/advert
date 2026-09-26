import { getCountry } from "@/lib/countries"
import { findSubcategory, isPricePeriodId, pricePeriod } from "@/lib/posting"
import type { CategoryId, Listing } from "@/lib/types"

const maxPrice = 999_999_999

/** Lightweight title/description refusals — not a full moderation system. */
const prohibited = /\b(cocaine|heroin|fentanyl|methamphetamine|ak-?47|grenade|human trafficking|child porn)\b/i

export type ListingFields = {
  title: string
  price: number
  currency: string
  priceSuffix?: string
  category: CategoryId | null
  subcategoryId: string | null
  details: Record<string, string>
  country: string
  city: string
  description: string
  phone: string
}

export type FieldErrors = Partial<Record<string, string>>

export function allowedCurrencies(country: string): string[] {
  const local = getCountry(country)?.currencies.map((item) => item.code) ?? []
  return local.includes("USD") ? local : [...local, "USD"]
}

export function listingFieldErrors(input: ListingFields): FieldErrors {
  const errors: FieldErrors = {}
  if (!input.category) errors.form = "Choose a category first."
  const subcategory = input.category ? findSubcategory(input.category, input.subcategoryId ?? undefined) : undefined
  if (input.category && !subcategory) errors.form = "Choose a type first."

  if (input.title.trim().length < 4) errors.title = "Use at least 4 characters."

  const amount = Number.isFinite(input.price) ? Math.round(input.price) : Number.NaN
  if (!Number.isFinite(amount) || amount <= 0) errors.price = "Enter an amount greater than zero."
  else if (amount > maxPrice) errors.price = "Enter a smaller amount."

  if (!getCountry(input.country)) errors.form = errors.form ?? "Choose a country."

  if (input.category && !allowedCurrencies(input.country).includes(input.currency)) {
    errors.currency = "Choose a currency for this country."
  }

  if (subcategory && !suffixAllowed(subcategory.priceSuffix, subcategory.periods, input.priceSuffix)) {
    errors.priceSuffix = "Choose how this price is charged."
  }

  if (subcategory) {
    for (const field of subcategory.fields) {
      const value = (input.details[field.id] ?? "").trim()
      if (field.required && !value) {
        errors[field.id] = field.kind === "select" ? `Choose ${field.label.toLowerCase()}.` : `Add the ${field.label.toLowerCase()}.`
        continue
      }
      if (value && field.kind === "select" && !(field.options ?? []).includes(value)) {
        errors[field.id] = `Choose ${field.label.toLowerCase()}.`
      }
    }
  }

  if (input.description.trim().length < 20) {
    errors.description = "Write at least 20 characters. This is the paragraph on the listing."
  }
  if (input.city.trim().length < 2) errors.city = "Add the city."
  const digits = input.phone.replace(/[^\d]/g, "").length
  if (digits < 7) errors.phone = "Add a phone number people can use."
  else if (digits > 15) errors.phone = "Use a shorter phone number."

  const combined = `${input.title} ${input.description}`
  if (prohibited.test(combined)) {
    errors.form = "This listing looks like a prohibited item. Remove it or reword the ad."
  }

  return errors
}

export function acceptListing(listing: Listing): { ok: true; listing: Listing } | { ok: false; reason: string } {
  const errors = listingFieldErrors({
    title: listing.title,
    price: listing.price,
    currency: listing.currency ?? "USD",
    priceSuffix: listing.priceSuffix,
    category: listing.category,
    subcategoryId: listing.subcategory ?? null,
    details: listing.details ?? {},
    country: listing.country,
    city: listing.city,
    description: listing.description,
    phone: listing.phone,
  })
  const reason = Object.values(errors).find((value) => value)
  if (reason) return { ok: false, reason }
  return { ok: true, listing: normalizeListing(listing) }
}

function suffixAllowed(
  fixedSuffix: string | undefined,
  periods: readonly string[],
  suffix: string | undefined,
): boolean {
  if (fixedSuffix) return suffix === fixedSuffix
  if (!suffix) return periods.includes("fixed")
  return periods.some((period) => isPricePeriodId(period) && pricePeriod(period).suffix === suffix)
}

function normalizeListing(listing: Listing): Listing {
  const subcategory = findSubcategory(listing.category, listing.subcategory)
  const details = subcategory
    ? Object.fromEntries(
        subcategory.fields.flatMap((field) => {
          const value = (listing.details?.[field.id] ?? "").trim().slice(0, 80)
          if (!value) return []
          if (field.kind === "select" && !(field.options ?? []).includes(value)) return []
          return [[field.id, value]]
        }),
      )
    : undefined
  return {
    ...listing,
    title: listing.title.trim().slice(0, 80),
    price: Math.round(listing.price),
    currency: listing.currency ?? "USD",
    description: listing.description.trim().slice(0, 2000),
    city: listing.city.trim().slice(0, 80),
    phone: listing.phone.trim().slice(0, 30),
    subcategory: subcategory?.id,
    details,
    condition: details?.condition || subcategory?.name || listing.condition,
    badge: listing.category === "jobs" ? "jobs" : undefined,
    featured: undefined,
    sold: listing.sold === true ? true : undefined,
    mine: true,
  }
}
