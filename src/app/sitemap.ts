import type { MetadataRoute } from "next"

import { canonicalOrigin } from "@/lib/search-discovery"
import { publicInventoryCategories } from "@/lib/search-discovery-store"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = canonicalOrigin()
  const categories = await publicInventoryCategories()
  return ["/", "/help", "/contact", "/terms", "/privacy", ...categories.map((id) => `/${id}`)]
    .map((path) => ({ url: `${origin}${path}` }))
}
