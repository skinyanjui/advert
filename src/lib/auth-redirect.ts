/** Default destination for a standalone sign-in. Protected actions pass their own `next` destination. */
export const DEFAULT_AUTH_NEXT = "/"

const UNSAFE_NEXT = /[\u0000-\u001F\u007F\s\\]/

/**
 * Only allow same-origin relative paths (pathname + search + hash).
 * Rejects control characters / whitespace (browsers strip tabs/newlines and
 * turn `/\tevil.com` into a host), backslashes, protocol-relative URLs, and
 * absolute URLs. Always parse through the URL constructor against a dummy host.
 */
export function safeAuthNext(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT): string {
  if (typeof value !== "string" || value.length === 0) return fallback
  // Reject before trim — leading whitespace / encoded controls are attacks.
  if (UNSAFE_NEXT.test(value)) return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback

  let parsed: URL
  try {
    parsed = new URL(value, "https://x.invalid")
  } catch {
    return fallback
  }
  if (parsed.username || parsed.password) return fallback
  if (parsed.host !== "x.invalid") return fallback
  if (parsed.origin !== "https://x.invalid") return fallback

  const next = `${parsed.pathname}${parsed.search}${parsed.hash}`
  if (!next.startsWith("/") || next.startsWith("//") || UNSAFE_NEXT.test(next)) return fallback
  return next
}

/** Apply a safe next path onto a URL by setting pathname / search / hash separately. */
export function applySafeAuthNext(target: URL, next: string): void {
  const safe = safeAuthNext(next)
  const parsed = new URL(safe, "https://x.invalid")
  target.pathname = parsed.pathname
  target.search = parsed.search
  target.hash = parsed.hash
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
