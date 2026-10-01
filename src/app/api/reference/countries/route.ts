import { createClient } from "@supabase/supabase-js"

import countries from "@/data/countries.json"
import { referenceAuthorityMetadata } from "@/lib/reference-authority"
import { referenceSnapshotMetadata } from "@/lib/reference-manifest"

export const runtime = "nodejs"

export async function GET() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await db.from("reference_countries").select("source_payload").order("name")
    if (!error && data?.length) {
      return Response.json({
        countries: data.map((row) => row.source_payload),
        source: "database",
        metadata: await referenceAuthorityMetadata("countries"),
      })
    }
  }
  return Response.json({
    countries,
    source: "snapshot",
    metadata: { authority: "snapshot", stale: false, ...referenceSnapshotMetadata("countries") },
  })
}
