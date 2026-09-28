/** Friendly copy for common Supabase Auth / network failures. */
export function mapAuthError(error: unknown): string {
  const message = extractMessage(error)
  const status = extractStatus(error)
  const normalized = message.toLowerCase()

  if (
    status === 429 ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit") ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("too many requests")
  ) {
    return "Too many emails sent. Wait a minute and try again."
  }

  if (
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
    normalized.includes("otp_disabled") ||
    normalized.includes("token is invalid") ||
    normalized.includes("invalid token") ||
    normalized.includes("invalid otp") ||
    normalized.includes("otp is invalid") ||
    normalized.includes("email link is invalid")
  ) {
    return "That code or link is invalid. Request a new one."
  }

  if (normalized.includes("email_not_confirmed") || normalized.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the link."
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials") ||
    normalized.includes("wrong password") ||
    normalized.includes("invalid email or password")
  ) {
    return "Wrong email or password."
  }

  if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
    return "An account with that email already exists. Sign in instead."
  }

  if (normalized.includes("same_password") || normalized.includes("same password")) {
    return "Choose a password that is different from your current one."
  }

  if (normalized.includes("weak_password") || normalized.includes("password should be")) {
    return "That password is too weak. Use at least 8 characters with a mix of letters and numbers."
  }

  if (normalized.includes("signup_disabled")) {
    return "New sign-ups are turned off right now."
  }

  if (!message) return "Something went wrong. Try again."
  return message
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
