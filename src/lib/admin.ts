import "server-only"

/** Comma-separated emails in ADMIN_EMAILS. Compared case-insensitively. */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = adminEmails()
  if (allow.length === 0) return false
  return allow.includes(email.trim().toLowerCase())
}
