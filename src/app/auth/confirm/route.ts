import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { createServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextPath = safeNext(searchParams.get("next"))

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = nextPath
  redirectTo.searchParams.delete("token_hash")
  redirectTo.searchParams.delete("type")
  redirectTo.searchParams.delete("next")

  if (token_hash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirectTo.searchParams.set("claimed", "1")
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = "/sign-in"
  redirectTo.searchParams.set("error", "link")
  return NextResponse.redirect(redirectTo)
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account"
  return value
}
