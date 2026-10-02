import type { MetadataRoute } from "next"

import { canonicalOrigin } from "@/lib/search-discovery"
import { publicListingSitemapIds } from "@/lib/search-discovery-store"

export const dynamic = "force-dynamic"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = canonicalOrigin()
  const listingMaps = await publicListingSitemapIds()
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/account", "/my-ads", "/messages", "/saved", "/auth/", "/sign-in", "/post", "/privacy/request", "/privacy/choices"] },
    sitemap: [`${origin}/sitemap.xml`, ...listingMaps.map(({ id }) => `${origin}/listings/sitemap/${id}.xml`)],
  }
}
