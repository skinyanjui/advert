import { resolvePlace } from "@/lib/cities"
import type { Listing } from "@/lib/types"

export type GeoPoint = {
  lat: number
  lng: number
}

export function listingPoint(listing: Pick<Listing, "country" | "city" | "latitude" | "longitude">): GeoPoint {
  if (Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude)) {
    return { lat: listing.latitude as number, lng: listing.longitude as number }
  }
  const place = resolvePlace(listing.country, listing.city)
  return { lat: place.lat, lng: place.lng }
}

/** Great-circle distance in kilometres. */
export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const earth = 6371
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
