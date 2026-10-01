import "server-only"

/** Bootstrap-only admin emails. Persisted board_user_roles is authoritative after first role resolution. */
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
