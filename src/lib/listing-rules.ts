import { contactPhoneError, normalizeContactPhone } from "@/lib/contact-phone"
import { getCountry } from "@/lib/countries"
import { boardCurrencyCodes } from "@/lib/fx"
import { marketplacePolicy } from "@/lib/marketplace-policy"
import { policyVersions } from "@/lib/policy-versions"
import {
  detailFieldValueLabel,
  findSubcategory,
  isPricePeriodId,
  normalizeDetailFieldValue,
  pricePeriod,
} from "@/lib/posting"
import type { CategoryId, Listing } from "@/lib/types"

const maxPrice = marketplacePolicy.listing.maxPrice

export const FAIR_ACCESS_ATTESTATION_VERSION = policyVersions.fairAccessAttestation

const residentialPropertyTypes = new Set(["sale", "rent", "apartment", "room", "hostel"])

export function requiresFairAccessAttestation(
  category: CategoryId | null | undefined,
  subcategoryId?: string | null,
): boolean {
  if (category === "jobs") return true
  return category === "property" && !!subcategoryId && residentialPropertyTypes.has(subcategoryId)
}

/** Lightweight title/description refusals — not a full moderation system. */
const prohibited = /\b(cocaine|heroin|fentanyl|methamphetamine|ak-?47|grenade|human trafficking|child porn)\b/i
const paymentCardPattern = /\b(?:\d[ -]*?){13,19}\b/
const sensitiveIdentifierPattern = /\b(?:cvv|cvc|card security code|social security number|ssn|passport number)\b/i

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
  locationDetail: string
  latitude?: number
  longitude?: number
  locationPrecision?: "city" | "specific"
  description: string
  phone: string
  contactWhatsApp?: boolean
  contactPhone?: boolean
  fairAccessAttested?: boolean
}

export type FieldErrors = Partial<Record<string, string>>

export function allowedCurrencies(country: string): string[] {
  const african = new Set(boardCurrencyCodes())
  return (getCountry(country)?.currencies.map((item) => item.code) ?? []).filter((code) => african.has(code))
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
      if (value && field.kind === "select" && !normalizeDetailFieldValue(field, value)) {
        errors[field.id] = `Choose ${field.label.toLowerCase()}.`
      }
    }
  }

  if (input.description.trim().length < 20) {
    errors.description = "Write at least 20 characters. This is the paragraph on the listing."
  }
  if (requiresFairAccessAttestation(input.category, input.subcategoryId) && input.fairAccessAttested !== true) {
    errors.fairAccess = "Confirm the fair-access rule for this housing or job listing."
  }
  if (input.city.trim().length < 2) errors.city = "Add the city."
  if (input.locationDetail.trim().length < 2) {
    errors.locationDetail = "Add a neighborhood, landmark, pickup point, or address."
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    errors.locationDetail = errors.locationDetail ?? "Choose a city or use your current location."
  }
  const directContactEnabled = input.contactWhatsApp === true || input.contactPhone === true
  const phoneReason = contactPhoneError(input.phone, { required: directContactEnabled, countryCode: input.country })
  if (phoneReason) errors.phone = phoneReason

  const combined = `${input.title} ${input.description} ${Object.values(input.details).join(" ")}`
  if (paymentCardPattern.test(combined) || sensitiveIdentifierPattern.test(combined)) {
    errors.form = "Remove payment-card or sensitive identity information. Listings should contain only information buyers need."
  } else if (prohibited.test(combined)) {
    errors.form = "This listing looks like a prohibited item. Remove it or reword the ad."
  }

  return errors
}

export function acceptListing(listing: Listing): { ok: true; listing: Listing } | { ok: false; reason: string } {
  const errors = listingFieldErrors({
    title: listing.title,
    price: listing.price,
    currency: listing.currency ?? allowedCurrencies(listing.country)[0] ?? "",
    priceSuffix: listing.priceSuffix,
    category: listing.category,
    subcategoryId: listing.subcategory ?? null,
    details: listing.details ?? {},
    country: listing.country,
    city: listing.city,
    locationDetail: listing.locationDetail ?? "",
    latitude: listing.latitude,
    longitude: listing.longitude,
    locationPrecision: listing.locationPrecision,
    description: listing.description,
    phone: listing.phone,
    contactWhatsApp: listing.contactWhatsApp,
    contactPhone: listing.contactPhone,
    fairAccessAttested: listing.fairAccessAttested,
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
          const value = (listing.details?.[field.id] ?? "")
            .trim()
            .slice(0, marketplacePolicy.listing.maxDetailValueLength)
          if (!value) return []
          const normalized = normalizeDetailFieldValue(field, value)
          if (field.kind === "select" && !normalized) return []
          return [[field.id, normalized ?? value]]
        }),
      )
    : undefined
  return {
    ...listing,
    title: listing.title.trim().slice(0, marketplacePolicy.listing.maxTitleLength),
    price: Math.round(listing.price),
    currency: listing.currency ?? allowedCurrencies(listing.country)[0] ?? "",
    description: listing.description.trim().slice(0, marketplacePolicy.listing.maxDescriptionLength),
    city: listing.city.trim().slice(0, marketplacePolicy.listing.maxCityLength),
    locationDetail: listing.locationDetail?.trim().slice(0, 120),
    latitude: Number.isFinite(listing.latitude) ? Number(listing.latitude) : undefined,
    longitude: Number.isFinite(listing.longitude) ? Number(listing.longitude) : undefined,
    locationPrecision: listing.locationPrecision === "specific" ? "specific" : "city",
    phone:
      listing.contactWhatsApp === false && listing.contactPhone === false
        ? ""
        : normalizeContactPhone(listing.phone, listing.country),
    contactWhatsApp: listing.contactWhatsApp === true,
    contactPhone: listing.contactPhone === true,
    subcategory: subcategory?.id,
    details,
    condition:
      (subcategory?.fields.find((field) => field.id === "condition") && details?.condition
        ? detailFieldValueLabel(
            subcategory.fields.find((field) => field.id === "condition")!,
            details.condition,
          )
        : undefined) ||
      subcategory?.name ||
      listing.condition,
    badge: listing.category === "jobs" ? "jobs" : undefined,
    featured: undefined,
    sponsored: listing.sponsored === true || listing.sponsoredLocked === true ? true : undefined,
    sponsoredLocked: listing.sponsoredLocked === true ? true : undefined,
    fairAccessAttested: requiresFairAccessAttestation(listing.category, listing.subcategory) ? true : undefined,
    fairAccessAttestationVersion: requiresFairAccessAttestation(listing.category, listing.subcategory)
      ? FAIR_ACCESS_ATTESTATION_VERSION
      : undefined,
    sold: listing.sold === true ? true : undefined,
    mine: true,
  }
}
