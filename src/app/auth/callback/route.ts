import { NextResponse, type NextRequest } from "next/server"

import { applySafeAuthNext, safeAuthNext } from "@/lib/auth-redirect"
import { createServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** PKCE code exchange for default ConfirmationURL redirects (signup, magic link, recovery, email change). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextPath = safeAuthNext(searchParams.get("next"))
  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error")
  const goingToReset = nextPath.startsWith("/auth/reset")

  if (errorDescription) {
    const failure = new URL("/sign-in", origin)
    failure.searchParams.set("error", goingToReset ? "device" : "link")
    failure.searchParams.set("next", nextPath)
    return NextResponse.redirect(failure)
  }

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const success = new URL(origin)
      applySafeAuthNext(success, nextPath)
      success.searchParams.set("claimed", "1")
      return NextResponse.redirect(success)
    }
    // PKCE verifier is browser-bound — opening the email on another device fails here.
    const failure = new URL(goingToReset ? "/auth/reset" : "/sign-in", origin)
    failure.searchParams.set("error", "device")
    failure.searchParams.set("next", nextPath)
    return NextResponse.redirect(failure)
  }

  const failure = new URL(goingToReset ? "/auth/reset" : "/sign-in", origin)
  failure.searchParams.set("error", goingToReset ? "device" : "link")
  failure.searchParams.set("next", nextPath)
  return NextResponse.redirect(failure)
}
