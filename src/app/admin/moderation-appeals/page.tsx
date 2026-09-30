import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminModerationAppealsPage } from "@/components/admin-moderation-appeals-page"
import { isAdminEmail } from "@/lib/admin"
import { signInHref } from "@/lib/auth-redirect"
import { listModerationAppealsAdmin } from "@/lib/moderation-redress"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Moderation appeals" }
export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id

  if (!userId || !email) redirect(signInHref("/admin/moderation-appeals"))

  if (!isAdminEmail(email)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Moderation appeals</h1>
        <p className="mt-2 text-sm text-neutral-500">This account is not on the admin allowlist.</p>
      </div>
    )
  }

  let appeals: Awaited<ReturnType<typeof listModerationAppealsAdmin>> = []
  let loadError = false
  try {
    appeals = await listModerationAppealsAdmin()
  } catch {
    loadError = true
  }

  return <AdminModerationAppealsPage initialAppeals={appeals} loadError={loadError} />
}
