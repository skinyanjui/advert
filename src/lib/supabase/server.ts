import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/supabase/env"

export async function createServerSupabase() {
  const url = publicSupabaseUrl()
  const key = publicSupabaseKey()
  if (!url || !key) {
    throw new Error("Supabase public credentials are missing")
  }
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component where cookies are read-only; proxy refreshes sessions.
        }
      },
    },
  })
}
