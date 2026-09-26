import type { Metadata } from "next"
import Link from "next/link"

import { AdminReportsClient } from "@/components/admin-reports-page"
import { Button } from "@/components/ui/button"
import { isAdminEmail } from "@/lib/admin"
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
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 text-sm text-neutral-500">Sign in with an admin account to review reports.</p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    )
  }

  if (!isAdminEmail(email)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 text-sm text-neutral-500">This account is not on the admin allowlist.</p>
      </div>
    )
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
