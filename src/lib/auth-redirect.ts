/** Default destination after a successful sign-in or email link. */
export const DEFAULT_AUTH_NEXT = "/account"

/**
 * Only allow same-origin relative paths. Rejects protocol-relative URLs,
 * absolute URLs, and empty values so auth redirects cannot leave the site.
 */
export function safeAuthNext(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT): string {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback
  return trimmed
}

/** Paths that require a signed-in Supabase user; guests are sent to /sign-in. */
export const PROTECTED_AUTH_PREFIXES = ["/my-ads", "/messages", "/admin/reports"] as const

export function isProtectedAuthPath(pathname: string): boolean {
  return PROTECTED_AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function signInHref(next?: string | null): string {
  const safe = safeAuthNext(next, DEFAULT_AUTH_NEXT)
  if (safe === DEFAULT_AUTH_NEXT) return "/sign-in"
  return `/sign-in?next=${encodeURIComponent(safe)}`
}
