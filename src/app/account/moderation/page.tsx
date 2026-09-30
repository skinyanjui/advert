import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { ModerationDecisionsPage } from "@/components/moderation-decisions-page"
import { signInHref } from "@/lib/auth-redirect"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Moderation decisions" }
export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  if (!data.user?.id) redirect(signInHref("/account/moderation"))
  return <ModerationDecisionsPage />
}
