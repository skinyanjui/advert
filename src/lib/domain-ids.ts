import { canonicalCountry } from "@/lib/countries"
import { isCurrencyPreference } from "@/lib/prefs"

declare const brand: unique symbol
export type Brand<T, Name extends string> = T & { readonly [brand]: Name }

export type CountryCode = Brand<string, "CountryCode">
export type CurrencyCode = Brand<string, "CurrencyCode">
export type TimeZoneId = Brand<string, "TimeZoneId">
export type StableId = Brand<string, "StableId">

export function countryCode(value: string | null | undefined): CountryCode | null {
  const canonical = canonicalCountry(value)
  return canonical ? (canonical as CountryCode) : null
}

export function currencyCode(value: string | null | undefined): CurrencyCode | null {
  return value && value !== "listing" && isCurrencyPreference(value) ? (value as CurrencyCode) : null
}

export function timeZoneId(value: string | null | undefined): TimeZoneId | null {
  if (!value || !value.includes("/")) return null
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return value as TimeZoneId
  } catch {
    return null
  }
}

export function stableId(value: string | null | undefined): StableId | null {
  const normalized = value?.trim().toLowerCase()
  return normalized && /^[a-z0-9][a-z0-9:_-]*$/.test(normalized) ? (normalized as StableId) : null
}
