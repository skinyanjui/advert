import { createClient } from "@supabase/supabase-js"

import { searchCities } from "@/lib/cities"
import { canonicalCountry } from "@/lib/countries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const country = canonicalCountry(params.get("country"))
  const query = params.get("q")?.trim().replace(/[%_]/g, "") ?? ""
  if (!country || query.length < 2 || query.length > 80) return Response.json({ places: [] })
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await db.from("reference_cities")
      .select("name,latitude,longitude,timezone")
      .eq("country_code", country)
      .ilike("name", `%${query}%`)
      .order("population", { ascending: false })
      .limit(8)
    if (!error) return Response.json({ places: data?.map((row) => ({ name: row.name, lat: row.latitude, lng: row.longitude, timezone: row.timezone })) ?? [], source: "database" })
  }
  return Response.json({ places: searchCities(country, query, 8).map((city) => ({ name: city.name, lat: city.lat, lng: city.lng, timezone: city.tz })), source: "snapshot" })
}
