import "server-only"

import { createClient } from "@supabase/supabase-js"

export function boardDb() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) throw new Error("Supabase server credentials are missing")
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
}
