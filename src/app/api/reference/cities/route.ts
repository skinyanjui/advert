import { createClient } from "@supabase/supabase-js"

import { z } from "zod"
import { referenceCityHitSchema } from "@/lib/reference-contracts"
import { searchCities } from "@/lib/cities"
import { referenceAuthorityMetadata } from "@/lib/reference-authority"
import { canonicalCountry } from "@/lib/countries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const country = canonicalCountry(params.get("country"))
  const query = params.get("q")?.trim().replace(/[%_]/g, "") ?? ""
  if (!country || query.length < 2 || query.length > 80) return Response.json({ places: [] })
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  try {
    if (url && key) {
      const db = createClient(url, key, { auth: { persistSession: false } })
      const { data, error } = await db.from("reference_cities")
        .select("geoname_id,name,latitude,longitude,timezone")
        .eq("country_code", country)
        .eq("active", true)
        .ilike("name", `%${query}%`)
        .order("population", { ascending: false })
        .limit(8).abortSignal(AbortSignal.timeout(4000))
      const parsed = z.array(referenceCityHitSchema).safeParse(data?.map((row) => ({
        id: row.geoname_id, name: row.name, lat: row.latitude, lng: row.longitude, timezone: row.timezone,
      })))
      if (!error && parsed.success) return Response.json({
        places: parsed.data,
        source: "database",
        metadata: await referenceAuthorityMetadata("cities"),
      })
    }
  } catch {
    // Failed or timed-out reads use the explicitly labelled snapshot.
  }
  return Response.json({
    places: searchCities(country, query, 8).map((city) => ({ id: city.id, name: city.name, lat: city.lat, lng: city.lng, timezone: city.tz })),
    source: "snapshot",
    metadata: await referenceAuthorityMetadata("cities", "snapshot"),
  })
}
