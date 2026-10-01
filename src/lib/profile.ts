import { contactPhoneError, normalizeContactPhone } from "@/lib/contact-phone"
import { canonicalCountry } from "@/lib/countries"
import { boardCurrencyCodes } from "@/lib/fx"
import { isLocale } from "@/lib/i18n/locales"
import { photoFileError } from "@/lib/photos"

export type BoardProfile = {
  userId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  city: string | null
  countryCode: string | null
  /** Saved call/SMS/WhatsApp number for prefilling new ads. Never on public seller overlay. */
  phone: string | null
  /** UI language preference (en/fr/sw). Nullable until set. */
  language: string | null
  /** Saved display currency preference. Nullable until set. */
  currency: string | null
  createdAt: string | null
}

export type ProfileUpdateInput = {
  displayName?: string | null
  city?: string | null
  countryCode?: string | null
  avatarUrl?: string | null
  phone?: string | null
  language?: string | null
  currency?: string | null
}

const displayNameMax = 80
const cityMax = 80

export function displayNameError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return "Enter a display name."
  if (trimmed.length > displayNameMax) return `Use at most ${displayNameMax} characters.`
  return undefined
}

export function cityError(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > cityMax) return `Use at most ${cityMax} characters.`
  return undefined
}

export function countryCodeError(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  if (!canonicalCountry(value)) return "Choose a valid country."
  return undefined
}

export function avatarFileError(file: File): string | undefined {
  return photoFileError(file)
}

export function languageError(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (!isLocale(value)) return "Choose a supported language."
  return undefined
}

export function currencyPreferenceError(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (value === "listing") return undefined
  if (!/^[A-Z]{3}$/.test(value)) return "Choose a valid currency."
  if (!boardCurrencyCodes().includes(value)) return "Choose a currency used on the board."
  return undefined
}

export function normalizeProfileUpdate(input: ProfileUpdateInput): {
  ok: true
  value: {
    displayName: string | null
    city: string | null
    countryCode: string | null
    avatarUrl?: string | null
    phone?: string | null
    language?: string | null
    currency?: string | null
  }
} | { ok: false; reason: string } {
  const displayName =
    input.displayName === undefined
      ? undefined
      : input.displayName === null
        ? null
        : input.displayName.trim()
  if (displayName !== undefined && displayName !== null) {
    const reason = displayNameError(displayName)
    if (reason) return { ok: false, reason }
  }

  const city =
    input.city === undefined ? undefined : input.city === null ? null : input.city.trim()
  if (city !== undefined && city !== null) {
    const reason = cityError(city)
    if (reason) return { ok: false, reason }
  }

  const countryRaw =
    input.countryCode === undefined
      ? undefined
      : input.countryCode === null
        ? null
        : input.countryCode.trim().toUpperCase()
  if (countryRaw !== undefined && countryRaw !== null) {
    const reason = countryCodeError(countryRaw)
    if (reason) return { ok: false, reason }
  }

  const countryCode =
    countryRaw === undefined ? undefined : countryRaw === null ? null : canonicalCountry(countryRaw) ?? null

  let phone: string | null | undefined
  if (input.phone !== undefined) {
    if (input.phone === null || !input.phone.trim()) {
      phone = null
    } else {
      const reason = contactPhoneError(input.phone, { required: false, countryCode })
      if (reason) return { ok: false, reason }
      phone = normalizeContactPhone(input.phone, countryCode) || null
    }
  }

  let language: string | null | undefined
  if (input.language !== undefined) {
    if (input.language === null || !input.language.trim()) {
      language = null
    } else {
      const trimmed = input.language.trim().toLowerCase()
      const reason = languageError(trimmed)
      if (reason) return { ok: false, reason }
      language = trimmed
    }
  }

  let currency: string | null | undefined
  if (input.currency !== undefined) {
    if (input.currency === null || !input.currency.trim()) {
      currency = null
    } else {
      const raw = input.currency.trim()
      const normalized = raw.toLowerCase() === "listing" ? "listing" : raw.toUpperCase()
      const reason = currencyPreferenceError(normalized)
      if (reason) return { ok: false, reason }
      currency = normalized
    }
  }

  return {
    ok: true,
    value: {
      displayName: displayName === undefined ? null : displayName || null,
      city: city === undefined ? null : city || null,
      countryCode: countryCode === undefined ? null : countryCode,
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(currency !== undefined ? { currency } : {}),
    },
  }
}

export function memberSinceYear(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null
  const year = new Date(createdAt).getFullYear()
  return Number.isFinite(year) ? year : null
}

/** Public URL path segment under the avatars bucket for this owner, or undefined. */
export function ownedAvatarPath(image: string, ownerId: string): string | undefined {
  const marker = "/storage/v1/object/public/avatars/"
  const index = image.indexOf(marker)
  if (index < 0) return undefined
  const path = image.slice(index + marker.length)
  const pattern = new RegExp(`^${ownerId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`, "i")
  return pattern.test(path) ? path : undefined
}

/**
 * Avatar updates may only be a new data: upload, null (clear), or the caller's
 * current owned avatar URL. Arbitrary external URLs are rejected.
 */
export function acceptAvatarUrlUpdate(
  next: string | null | undefined,
  current: string | null,
  ownerId: string,
): { ok: true; kind: "data" | "clear" | "keep" | "omit"; value?: string } | { ok: false; reason: string } {
  if (next === undefined) return { ok: true, kind: "omit" }
  if (next === null) return { ok: true, kind: "clear" }
  if (typeof next !== "string") return { ok: false, reason: "Upload a JPEG, PNG, or WebP photo." }
  if (next.startsWith("data:image/")) return { ok: true, kind: "data", value: next }
  if (current && next === current && ownedAvatarPath(next, ownerId)) {
    return { ok: true, kind: "keep", value: current }
  }
  return { ok: false, reason: "Upload a photo from this device instead of linking an external image." }
}
