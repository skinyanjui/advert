/** Shared call/WhatsApp contact phone rules (listings + saved profile contact). */

export const contactPhoneMaxLength = 30

export function contactPhoneDigits(value: string): string {
  return value.replace(/[^\d]/g, "")
}

/**
 * Validate a contact phone. When `required` is false (profile default), empty is allowed.
 * Same digit bounds as listing ads: 7–15 digits.
 */
export function contactPhoneError(
  value: string,
  options: { required?: boolean } = {},
): string | undefined {
  const trimmed = value.trim()
  const digits = contactPhoneDigits(trimmed).length
  if (!trimmed) {
    return options.required ? "Add a phone number people can use." : undefined
  }
  if (digits < 7) return "Add a phone number people can use."
  if (digits > 15) return "Use a shorter phone number."
  if (trimmed.length > contactPhoneMaxLength) {
    return `Use at most ${contactPhoneMaxLength} characters.`
  }
  return undefined
}

export function normalizeContactPhone(value: string): string {
  return value.trim().slice(0, contactPhoneMaxLength)
}

/** Placeholder uses the listing country's calling code when known; never invents a default. */
export function contactPhonePlaceholder(callingCode?: string | null): string {
  return callingCode ? `${callingCode} 7XX XXX XXX` : "+… 7XX XXX XXX"
}

/**
 * Prefill a new ad's phone from the saved profile. Editing an existing ad keeps
 * the listing phone and never falls back to the profile.
 */
export function prefillListingPhone(
  existingPhone: string | null | undefined,
  profilePhone: string | null | undefined,
): string {
  if (typeof existingPhone === "string" && existingPhone.trim()) {
    return existingPhone.trim().slice(0, contactPhoneMaxLength)
  }
  if (typeof profilePhone === "string" && profilePhone.trim()) {
    return profilePhone.trim().slice(0, contactPhoneMaxLength)
  }
  return ""
}
