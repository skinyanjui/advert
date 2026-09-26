import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
        }
      },
    },
  })

  // Verifies the JWT; refreshes cookies when needed. Do not use getSession() here.
  await supabase.auth.getClaims()
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|listings/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
