import { createClient } from "@supabase/supabase-js"

import { z } from "zod"
import { referenceCountrySchema } from "@/lib/reference-contracts"

import countries from "@/data/countries.json"
import { referenceAuthorityMetadata } from "@/lib/reference-authority"

export const runtime = "nodejs"

export async function GET() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  try {
    if (url && key) {
      const db = createClient(url, key, { auth: { persistSession: false } })
      const { data, error } = await db.from("reference_countries").select("source_payload").eq("active", true).order("name").abortSignal(AbortSignal.timeout(4000))
      const parsed = z.array(referenceCountrySchema).safeParse(data?.map((row) => row.source_payload))
      if (!error && parsed.success && parsed.data.length) {
        return Response.json({
          countries: parsed.data,
          source: "database",
          metadata: await referenceAuthorityMetadata("countries"),
        })
      }
    }
  } catch {
    // Failed or timed-out reads use the explicitly labelled snapshot.
  }
  return Response.json({
    countries,
    source: "snapshot",
    metadata: await referenceAuthorityMetadata("countries", "snapshot"),
  })
}
