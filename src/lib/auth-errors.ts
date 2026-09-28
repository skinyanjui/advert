/** Friendly copy for common Supabase Auth / network failures. */
export function mapAuthError(error: unknown): string {
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
    return "Too many emails sent. Wait a minute and try again."
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
    return "That code or link has expired. Request a new one."
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
    return "That code or link is invalid. Request a new one."
  }

  if (
    normalizedCode === "email_not_confirmed" ||
    normalized.includes("email_not_confirmed") ||
    normalized.includes("email not confirmed")
  ) {
    return "Confirm your email before signing in. Check your inbox for the link."
  }

  if (
    normalizedCode === "invalid_credentials" ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials") ||
    normalized.includes("wrong password") ||
    normalized.includes("invalid email or password")
  ) {
    return "Wrong email or password."
  }

  if (
    normalizedCode === "reauthentication_needed" ||
    normalized.includes("reauthentication_needed") ||
    normalized.includes("reauthentication required") ||
    normalized.includes("reauthenticate")
  ) {
    return "Confirm it’s you: check your email for a verification code, then enter it below."
  }

  if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
    return "An account with that email already exists. Sign in instead."
  }

  if (
    normalizedCode === "same_password" ||
    normalized.includes("same_password") ||
    normalized.includes("same password")
  ) {
    return "Choose a password that is different from your current one."
  }

  if (
    normalizedCode === "weak_password" ||
    normalized.includes("weak_password") ||
    normalized.includes("password should be")
  ) {
    return "That password is too weak. Use at least 8 characters with a mix of letters and numbers."
  }

  if (normalizedCode === "signup_disabled" || normalized.includes("signup_disabled")) {
    return "New sign-ups are turned off right now."
  }

  if (message || code) {
    console.error("[auth]", error)
  }
  return "Something went wrong. Try again."
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
