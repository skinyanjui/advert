import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isProtectedAuthPath, signInHref } from "@/lib/auth-redirect"
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/supabase/env"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = publicSupabaseUrl()
  const key = publicSupabaseKey()
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [headerKey, value] of Object.entries(headers)) {
          response.headers.set(headerKey, value)
        }
      },
    },
  })

  // Verifies the JWT; refreshes cookies when needed. Do not use getSession() here.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)

  const { pathname, search } = request.nextUrl
  if (isProtectedAuthPath(pathname) && !signedIn) {
    const next = `${pathname}${search}`
    const redirectUrl = request.nextUrl.clone()
    const href = signInHref(next)
    const parsed = new URL(href, request.nextUrl.origin)
    redirectUrl.pathname = parsed.pathname
    redirectUrl.search = parsed.search
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|listings/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
