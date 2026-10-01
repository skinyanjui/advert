import "server-only"

import { boardDb } from "@/lib/board-db"
import { referenceSnapshotMetadata, type ReferenceDataset } from "@/lib/reference-manifest"

export async function referenceAuthorityMetadata(dataset: ReferenceDataset, authority: "database" | "snapshot" = "database") {
  const snapshot = referenceSnapshotMetadata(dataset)
  const base = {
    authority,
    sourceName: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    license: snapshot.license,
    importedAt: null,
    generatedAt: snapshot.generatedAt,
  }
  if (authority === "snapshot") return { ...base, version: snapshot.version, stale: false, recordCount: snapshot.recordCount }
  try {
    const { data, error } = await boardDb()
      .from("reference_imports")
      .select("source_version,content_hash,record_count,imported_at,source_url,license,generated_at")
      .eq("source", snapshot.source)
      .order("imported_at", { ascending: false })
      .limit(1)
      .abortSignal(AbortSignal.timeout(4000))
      .maybeSingle()
    if (!error && data) {
      const version = data.content_hash || data.source_version || null
      return {
        ...base,
        version,
        stale: version !== snapshot.version,
        sourceUrl: data.source_url || snapshot.sourceUrl,
        license: data.license || snapshot.license,
        importedAt: data.imported_at ?? null,
        generatedAt: data.generated_at ?? null,
        recordCount: data.record_count ?? null,
      }
    }
  } catch {
    // Missing provenance must not change the authority of the data actually served.
  }
  return { ...base, version: null, stale: true, recordCount: null }
}
