import type { Metadata, MetadataRoute } from "next"

import { isSampleListing } from "@/lib/catalog"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import type { Listing, ListingStatus } from "@/lib/types"

type OriginEnvironment = { APP_BASE_URL?: string; VERCEL_PROJECT_PRODUCTION_URL?: string }

/** Production identity is configured, never inferred from a request Host header. */
export function canonicalOrigin(environment: OriginEnvironment = { APP_BASE_URL: process.env.APP_BASE_URL, VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL }): string {
  const value = environment.APP_BASE_URL?.trim()
    || `https://${environment.VERCEL_PROJECT_PRODUCTION_URL?.trim() || "adverts-murex.vercel.app"}`
  const url = new URL(value)
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && local))) {
    throw new Error("The canonical site origin must use HTTPS (or local development HTTP).")
  }
  return url.origin
}

export type DiscoveryListing = {
  id: string
  posted_at?: string | null
  expires_at?: string | null
  hidden_at?: string | null
  status?: string | null
  sold?: boolean | null
  expiresAt?: string | null
}

/** Apply the public lifecycle again even when the database query filtered rows. */
export function isIndexableListing(row: DiscoveryListing, now = Date.now()): boolean {
  const expiresAt = row.expires_at ?? row.expiresAt ?? undefined
  if (!/^ad-[a-zA-Z0-9-]{1,64}$/.test(row.id) || isSampleListing(row.id)) return false
  if (row.status && row.status !== "active") return false
  if (expiresAt && !Number.isFinite(Date.parse(expiresAt))) return false
  return isPubliclyVisibleListing({
    status: row.status as ListingStatus | undefined,
    hidden: Boolean(row.hidden_at),
    sold: row.sold === true,
    expiresAt,
  }, now)
}

export function listingSitemapEntries(rows: DiscoveryListing[], origin: string, now = Date.now()): MetadataRoute.Sitemap {
  return rows.filter((row) => isIndexableListing(row, now)).map((row) => ({
    url: `${origin}/listings/${encodeURIComponent(row.id)}`,
    ...(row.posted_at && Number.isFinite(Date.parse(row.posted_at)) ? { lastModified: row.posted_at } : {}),
  }))
}

export function listingMetadata(listing: Listing | undefined): Metadata {
  if (!listing || !isPubliclyVisibleListing(listing)) return { title: "Listing unavailable", robots: { index: false, follow: false } }
  const sample = isSampleListing(listing.id)
  const description = `${sample ? "Sample ad. Contact unavailable. " : ""}${listing.description.replace(/\s+/g, " ").trim()}`.slice(0, 160)
  const image = listing.image.startsWith("/") || /^https:\/\//i.test(listing.image) ? listing.image : undefined
  const canonical = `/listings/${encodeURIComponent(listing.id)}`
  return {
    title: listing.title,
    description,
    alternates: { canonical },
    ...(sample ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: listing.title, description, url: canonical, type: "article", images: image ? [{ url: image, alt: listing.title }] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title: listing.title, description, images: image ? [image] : [] },
  }
}

// Keep each generated XML well below the protocol's 50,000 URL ceiling.
export const listingSitemapSize = 10_000

export function listingSitemapIds(count: number): { id: number }[] {
  return Array.from({ length: Math.max(1, Math.ceil(count / listingSitemapSize)) }, (_, id) => ({ id }))
}

/** A database API can cap pages below our requested size; only empty means done. */
export async function readSitemapRows<T>(
  load: (from: number, to: number) => Promise<T[]>,
  offset: number,
  limit: number,
): Promise<T[]> {
  const result: T[] = []
  while (result.length < limit) {
    const from = offset + result.length
    const rows = await load(from, from + Math.min(250, limit - result.length) - 1)
    if (rows.length === 0) break
    result.push(...rows)
  }
  return result
}
