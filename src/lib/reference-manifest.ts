import { createHash } from "node:crypto"
import cities from "@/data/cities.json"
import countries from "@/data/countries.json"

export const referenceSources = {
  countries: {
    source: "mledoze/countries snapshot",
    sourceUrl: "https://github.com/mledoze/countries",
    license: "ODbL-1.0",
  },
  cities: {
    source: "GeoNames cities15000 snapshot",
    sourceUrl: "https://download.geonames.org/export/dump/cities15000.zip",
    license: "CC-BY-4.0",
  },
} as const

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
