import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminDenied } from "@/components/admin-denied"
import { AdminReportsClient } from "@/components/admin-reports-page"
import { isAdminEmail } from "@/lib/admin"
import { signInHref } from "@/lib/auth-redirect"
import { listPendingReports } from "@/lib/board-store"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Reports",
}

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id

  if (!userId || !email) {
    redirect(signInHref("/admin/reports"))
  }

  if (!isAdminEmail(email)) {
    return <AdminDenied />
  }

  let reports: Awaited<ReturnType<typeof listPendingReports>> = []
  let loadError = false
  try {
    reports = await listPendingReports()
  } catch {
    loadError = true
  }

  return <AdminReportsClient initialReports={reports} loadError={loadError} />
}
