import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminPrivacyPage } from "@/components/admin-privacy-page"
import { can } from "@/lib/access-control"
import { signInHref } from "@/lib/auth-redirect"
import { resolvePersistedRole } from "@/lib/rbac-store"
import { listPrivacyRequestsAdmin } from "@/lib/privacy-requests"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Privacy requests" }
export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id

  if (!userId || !email) redirect(signInHref("/admin/privacy"))

  const role = await resolvePersistedRole(userId, email)
  if (!can(role, "privacy:review")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy requests</h1>
        <p className="mt-2 text-sm text-neutral-500">This account does not have the required administrative permission.</p>
      </div>
    )
  }

  let requests: Awaited<ReturnType<typeof listPrivacyRequestsAdmin>> = []
  let loadError = false
  try {
    requests = await listPrivacyRequestsAdmin()
  } catch {
    loadError = true
  }

  return <AdminPrivacyPage initialRequests={requests} loadError={loadError} now={new Date().toISOString()} />
}
