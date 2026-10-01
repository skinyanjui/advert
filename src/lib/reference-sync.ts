import "server-only"

import { boardDb } from "@/lib/board-db"
import countries from "@/data/countries.json"
import cities from "@/data/cities.json"
import { referenceCountrySchema, referenceCitySchema } from "@/lib/reference-contracts"
import { referenceSnapshotMetadata } from "@/lib/reference-manifest"

/** One database transaction publishes the complete snapshot and its provenance. */
export async function syncReferenceData() {
  const countryRows = countries.map((row) => referenceCountrySchema.parse(row))
  const cityRows = cities.filter((city) => city.pop >= 15000).map((row) => referenceCitySchema.parse(row))
  const countryMeta = referenceSnapshotMetadata("countries")
  const cityMeta = referenceSnapshotMetadata("cities")
  const { data, error } = await boardDb().rpc("sync_reference_snapshot", {
    countries_snapshot: countryRows,
    cities_snapshot: cityRows,
    countries_hash: countryMeta.contentHash,
    cities_hash: cityMeta.contentHash,
    snapshot_generated_at: countryMeta.generatedAt,
  }).abortSignal(AbortSignal.timeout(20000))
  if (error) throw error
  return data as { countries: number; cities: number }
}
