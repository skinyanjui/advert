import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { applySafeAuthNext, safeAuthNext } from "@/lib/auth-redirect"
import { createServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Token-hash exchange for email templates that use {{ .TokenHash }}. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const fallback = type === "recovery" ? "/auth/reset" : "/account"
  const nextPath = safeAuthNext(searchParams.get("next"), fallback)

  const redirectTo = request.nextUrl.clone()
  applySafeAuthNext(redirectTo, nextPath)

  if (token_hash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      if (type === "recovery") {
        applySafeAuthNext(redirectTo, "/auth/reset")
      }
      redirectTo.searchParams.set("claimed", "1")
      return NextResponse.redirect(redirectTo)
    }
  }

  applySafeAuthNext(redirectTo, "/sign-in")
  redirectTo.searchParams.set("error", "link")
  redirectTo.searchParams.set("next", nextPath)
  return NextResponse.redirect(redirectTo)
}
