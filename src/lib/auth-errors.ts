import { translate, type MessageKey } from "@/lib/i18n"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales"

/** Map Supabase Auth / network failures to a stable message key. */
export function mapAuthErrorKey(error: unknown): MessageKey {
  const message = extractMessage(error)
  const status = extractStatus(error)
  const code = extractCode(error)
  const normalized = message.toLowerCase()
  const normalizedCode = code.toLowerCase()

  if (
    status === 429 ||
    normalizedCode === "over_email_send_rate_limit" ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit") ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("too many requests")
  ) {
    return "auth.error.rateLimit"
  }

  if (
    normalizedCode === "otp_expired" ||
    normalized.includes("otp_expired") ||
    normalized.includes("token has expired") ||
    normalized.includes("link has expired") ||
    normalized.includes("magic link has expired") ||
    (normalized.includes("expired") &&
      (normalized.includes("otp") || normalized.includes("token") || normalized.includes("link")))
  ) {
    return "auth.error.otpExpired"
  }

  if (
    normalizedCode === "otp_disabled" ||
    normalized.includes("otp_disabled") ||
    normalized.includes("token is invalid") ||
    normalized.includes("invalid token") ||
    normalized.includes("invalid otp") ||
    normalized.includes("otp is invalid") ||
    normalized.includes("email link is invalid")
  ) {
    return "auth.error.otpInvalid"
  }

  if (
    normalizedCode === "email_not_confirmed" ||
    normalized.includes("email_not_confirmed") ||
    normalized.includes("email not confirmed")
  ) {
    return "auth.error.emailNotConfirmed"
  }

  if (
    normalizedCode === "invalid_credentials" ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials") ||
    normalized.includes("wrong password") ||
    normalized.includes("invalid email or password")
  ) {
    return "auth.error.invalidCredentials"
  }

  if (
    normalizedCode === "reauthentication_needed" ||
    normalized.includes("reauthentication_needed") ||
    normalized.includes("reauthentication required") ||
    normalized.includes("reauthenticate")
  ) {
    return "auth.error.reauth"
  }

  if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
    return "auth.error.alreadyRegistered"
  }

  if (
    normalizedCode === "same_password" ||
    normalized.includes("same_password") ||
    normalized.includes("same password")
  ) {
    return "auth.error.samePassword"
  }

  if (
    normalizedCode === "weak_password" ||
    normalized.includes("weak_password") ||
    normalized.includes("password should be")
  ) {
    return "auth.error.weakPassword"
  }

  if (normalizedCode === "signup_disabled" || normalized.includes("signup_disabled")) {
    return "auth.error.signupDisabled"
  }

  if (message || code) {
    console.error("[auth]", error)
  }
  return "auth.error.generic"
}

/** Friendly copy for common Supabase Auth / network failures. */
export function mapAuthError(error: unknown, locale?: Locale): string {
  const key = mapAuthErrorKey(error)
  return translate(resolveLocale(locale), key)
}

export function isReauthenticationRequired(error: unknown): boolean {
  const code = extractCode(error).toLowerCase()
  const message = extractMessage(error).toLowerCase()
  return (
    code === "reauthentication_needed" ||
    message.includes("reauthentication_needed") ||
    message.includes("reauthentication required")
  )
}

function resolveLocale(locale?: Locale): Locale {
  if (locale && isLocale(locale)) return locale
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("africa-classifieds-language")
      if (isLocale(stored)) return stored
    } catch {
      /* ignore */
    }
  }
  return defaultLocale
}

function extractMessage(error: unknown): string {
  if (!error) return ""
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null && "message" in error) {
    const value = (error as { message?: unknown }).message
    return typeof value === "string" ? value : ""
  }
  return ""
}

function extractStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const value = (error as { status?: unknown }).status
    return typeof value === "number" ? value : undefined
  }
  return undefined
}

function extractCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const value = (error as { code?: unknown }).code
    return typeof value === "string" ? value : ""
  }
  return ""
}
