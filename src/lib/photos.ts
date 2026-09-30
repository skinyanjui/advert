export const maxListingPhotos = 6
export const maxPhotoBytes = 12_000_000
export const maxStoredPhotoBytes = 1_500_000
export const maxPhotoDimension = 1600

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function listingImages(listing: { image: string; images?: string[] }): string[] {
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    return listing.images.filter((item) => typeof item === "string" && item.trim()).slice(0, maxListingPhotos)
  }
  return listing.image ? [listing.image] : []
}

export function withCoverImage(images: string[]): { image: string; images: string[] } {
  const cleaned = images.filter((item) => typeof item === "string" && item.trim()).slice(0, maxListingPhotos)
  return { image: cleaned[0] ?? "", images: cleaned }
}

export function photoFileError(file: File): string | undefined {
  if (!allowedTypes.has(file.type)) return "Choose a JPEG, PNG, or WebP photo."
  if (file.size > maxPhotoBytes) return "Use a photo under 12MB."
  return undefined
}

/** Re-encode before storage: strips EXIF/GPS, bounds dimensions, and compresses phone photos. */
export async function prepareListingPhoto(file: File): Promise<string> {
  const reason = photoFileError(file)
  if (reason) throw new Error(reason)
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxPhotoDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Image processing is unavailable.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    let blob = await canvasBlob(canvas, 0.82)
    if (blob.size > maxStoredPhotoBytes) blob = await canvasBlob(canvas, 0.68)
    return await blobDataUrl(blob)
  } finally {
    bitmap.close()
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image processing failed."))), "image/jpeg", quality)
  })
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Image processing failed."))
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image processing failed."))
    reader.readAsDataURL(blob)
  })
}

export function normalizeListingPhotos(value: unknown, fallbackImage: string): string[] {
  if (Array.isArray(value)) {
    const images = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    if (images.length > 0) return images.slice(0, maxListingPhotos)
  }
  return fallbackImage ? [fallbackImage] : []
}
