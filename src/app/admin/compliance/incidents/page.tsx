import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminComplianceIncidents } from "@/components/admin-compliance-incidents"
import { isAdminEmail } from "@/lib/admin"
import { signInHref } from "@/lib/auth-redirect"
import { listComplianceIncidents } from "@/lib/compliance-incidents"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Compliance incidents" }
export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id

  if (!userId || !email) redirect(signInHref("/admin/compliance/incidents"))

  if (!isAdminEmail(email)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Compliance incidents</h1>
        <p className="mt-2 text-sm text-neutral-500">This account is not on the admin allowlist.</p>
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

  return <AdminComplianceIncidents initialIncidents={incidents} loadError={loadError} />
}
