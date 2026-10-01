import "server-only"

import { boardDb } from "@/lib/board-db"
import { referenceSnapshotMetadata, type ReferenceDataset } from "@/lib/reference-manifest"

export async function referenceAuthorityMetadata(dataset: ReferenceDataset) {
  const snapshot = referenceSnapshotMetadata(dataset)
  try {
    const { data, error } = await boardDb()
      .from("reference_imports")
      .select("source_version,content_hash,imported_at,source_url,license,generated_at")
      .eq("source", snapshot.source)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      const version =
        (typeof data.content_hash === "string" && data.content_hash) ||
        (typeof data.source_version === "string" ? data.source_version : "")
      return {
        authority: "database" as const,
        version,
        stale: version !== snapshot.version,
        sourceName: snapshot.source,
        sourceUrl: data.source_url || snapshot.sourceUrl,
        license: data.license || snapshot.license,
        importedAt: data.imported_at ?? null,
        generatedAt: data.generated_at ?? null,
        recordCount: snapshot.recordCount,
      }
    }
  } catch {
    // Reference data can still be served from the checked-in snapshot.
  }

  return {
    authority: "snapshot" as const,
    version: snapshot.version,
    stale: false,
    sourceName: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    license: snapshot.license,
    recordCount: snapshot.recordCount,
  }
}
