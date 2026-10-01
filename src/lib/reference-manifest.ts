import { createHash } from "node:crypto"
import cities from "@/data/cities.json"
import countries from "@/data/countries.json"

import manifest from "@/data/reference-manifest.json"

export const referenceSources = manifest

export type ReferenceDataset = keyof typeof referenceSources

export function referenceSnapshotMetadata(dataset: ReferenceDataset) {
  const rows = dataset === "countries" ? countries : cities.filter((city) => city.pop >= 15000)
  const contentHash = createHash("sha256").update(JSON.stringify(rows)).digest("hex")
  return {
    ...referenceSources[dataset],
    version: contentHash,
    contentHash,
    recordCount: rows.length,
  }
}
