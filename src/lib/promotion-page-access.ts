import "server-only"
import { redirect } from "next/navigation"
import { can } from "@/lib/access-control"
import { resolvePersistedRole } from "@/lib/rbac-store"
import { signInHref } from "@/lib/auth-redirect"
import { createServerSupabase } from "@/lib/supabase/server"

export async function requirePromotionPage(path: string, admin = false) {
  let user
  try {
    const supabase = await createServerSupabase()
    user = (await supabase.auth.getUser()).data.user
  } catch { /* Unconfigured auth is not a signed-in account. */ }
  if (!user) redirect(signInHref(path))
  const role = await resolvePersistedRole(user.id, user.email)
  if (!can(role, admin ? "promotion:manage" : "profile")) redirect("/account")
}
