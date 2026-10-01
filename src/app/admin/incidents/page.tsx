import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminComplianceIncidentsPage } from "@/components/admin-compliance-incidents-page"
import { can } from "@/lib/access-control"
import { signInHref } from "@/lib/auth-redirect"
import { resolvePersistedRole } from "@/lib/rbac-store"
import { listComplianceIncidents } from "@/lib/compliance-incidents"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Compliance incidents" }
export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id
  if (!userId || !email) redirect(signInHref("/admin/incidents"))

  const role = await resolvePersistedRole(userId, email)
  if (!can(role, "compliance:manage")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Compliance incidents</h1>
        <p className="mt-2 text-sm text-neutral-500">This account does not have the required administrative permission.</p>
      </div>
    )
  }

  let incidents: Awaited<ReturnType<typeof listComplianceIncidents>> = []
  let loadError = false
  try {
    incidents = await listComplianceIncidents()
  } catch {
    loadError = true
  }
  return <AdminComplianceIncidentsPage initialIncidents={incidents} loadError={loadError} />
}
