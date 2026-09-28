import { NextResponse, type NextRequest } from "next/server"

import { safeAuthNext } from "@/lib/auth-redirect"
import { createServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** PKCE code exchange for magic links, OAuth, and confirmations that land with ?code=. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextPath = safeAuthNext(searchParams.get("next"))
  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error")

  if (errorDescription) {
    const failure = new URL("/sign-in", origin)
    failure.searchParams.set("error", "link")
    failure.searchParams.set("next", nextPath)
    return NextResponse.redirect(failure)
  }

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const success = new URL(nextPath, origin)
      success.searchParams.set("claimed", "1")
      return NextResponse.redirect(success)
    }
  }

  const failure = new URL("/sign-in", origin)
  failure.searchParams.set("error", "link")
  failure.searchParams.set("next", nextPath)
  return NextResponse.redirect(failure)
}
