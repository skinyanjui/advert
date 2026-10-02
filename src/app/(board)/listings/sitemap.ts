import type { MetadataRoute } from "next"

import { canonicalOrigin, listingSitemapEntries } from "@/lib/search-discovery"
import { publicListingSitemapIds, publicListingSitemapRows } from "@/lib/search-discovery-store"

export const dynamic = "force-dynamic"

export async function generateSitemaps() {
  return publicListingSitemapIds()
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  return listingSitemapEntries(await publicListingSitemapRows(await id), canonicalOrigin())
}
