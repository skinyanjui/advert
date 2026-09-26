import { createClient } from "@supabase/supabase-js"

import countries from "@/data/countries.json"

export const runtime = "nodejs"

export async function GET() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await db.from("reference_countries").select("source_payload").order("name")
    if (!error && data?.length) return Response.json({ countries: data.map((row) => row.source_payload), source: "database" })
  }
  return Response.json({ countries, source: "snapshot" })
}
