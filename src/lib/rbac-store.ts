import "server-only"

import { isAdminEmail } from "@/lib/admin"
import { boardDb } from "@/lib/board-db"

export const persistedAppRoles = ["member", "admin"] as const
export type PersistedAppRole = (typeof persistedAppRoles)[number]

function isPersistedRole(value: unknown): value is PersistedAppRole {
  return value === "member" || value === "admin"
}

/**
 * Resolve and persist the account role. ADMIN_EMAILS is only a bootstrap path:
 * once a role row exists, that database row is authoritative.
 */
export async function resolvePersistedRole(
  userId: string,
  email?: string | null,
): Promise<PersistedAppRole> {
  const db = boardDb()
  const { data, error } = await db
    .from("board_user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  if (!error && isPersistedRole(data?.role)) return data.role

  const bootstrapRole: PersistedAppRole = isAdminEmail(email) ? "admin" : "member"
  const { error: writeError } = await db.from("board_user_roles").upsert(
    {
      user_id: userId,
      role: bootstrapRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  )
  if (writeError) {
    console.error("Could not persist application role", { userId, error: writeError })
  }
  return bootstrapRole
}
