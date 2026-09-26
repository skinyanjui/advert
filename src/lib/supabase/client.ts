import { createBrowserClient } from "@supabase/ssr"

import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/supabase/env"

export function createBrowserSupabase() {
  const url = publicSupabaseUrl()
  const key = publicSupabaseKey()
  if (!url || !key) {
    throw new Error("Supabase public credentials are missing")
  }
  return createBrowserClient(url, key)
}
