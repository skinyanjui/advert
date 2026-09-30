import assert from "node:assert/strict"
import { test } from "node:test"

import {
  listingImages,
  maxListingPhotos,
  normalizeListingPhotos,
  photoFileError,
  withCoverImage,
} from "../src/lib/photos"

test("listingImages falls back to image for legacy ads", () => {
  assert.deepEqual(listingImages({ image: "/listings/a.jpg" }), ["/listings/a.jpg"])
  assert.deepEqual(listingImages({ image: "/listings/a.jpg", images: ["/listings/b.jpg", "/listings/c.jpg"] }), [
    "/listings/b.jpg",
    "/listings/c.jpg",
  ])
})

test("withCoverImage caps at six and sets cover", () => {
  const photos = Array.from({ length: 8 }, (_, index) => `/listings/${index}.jpg`)
  const result = withCoverImage(photos)
  assert.equal(result.images.length, maxListingPhotos)
  assert.equal(result.image, result.images[0])
})

test("normalizeListingPhotos and file checks", () => {
  assert.deepEqual(normalizeListingPhotos(undefined, "/listings/a.jpg"), ["/listings/a.jpg"])
  assert.equal(photoFileError(new File([""], "x.txt", { type: "text/plain" })), "Choose a JPEG, PNG, or WebP photo.")
  assert.equal(photoFileError(new File([new Uint8Array(12_000_001)], "large.jpg", { type: "image/jpeg" })), "Use a photo under 12MB.")
})
