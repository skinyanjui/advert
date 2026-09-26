export const maxListingPhotos = 6
export const maxPhotoBytes = 700_000
export const maxStoredPhotoBytes = 1_500_000

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function listingImages(listing: { image: string; images?: string[] }): string[] {
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    return listing.images.filter((item) => typeof item === "string" && item.trim()).slice(0, maxListingPhotos)
  }
  return listing.image ? [listing.image] : []
}

export function withCoverImage(images: string[]): { image: string; images: string[] } {
  const cleaned = images.filter((item) => typeof item === "string" && item.trim()).slice(0, maxListingPhotos)
  return {
    image: cleaned[0] ?? "",
    images: cleaned,
  }
}

export function photoFileError(file: File): string | undefined {
  if (!allowedTypes.has(file.type)) return "Choose a JPEG, PNG, or WebP photo."
  if (file.size > maxPhotoBytes) return "Use a photo under 700KB."
  return undefined
}

export function normalizeListingPhotos(value: unknown, fallbackImage: string): string[] {
  if (Array.isArray(value)) {
    const images = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    if (images.length > 0) return images.slice(0, maxListingPhotos)
  }
  return fallbackImage ? [fallbackImage] : []
}
