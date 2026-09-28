import assert from "node:assert/strict"
import { test } from "node:test"

import { scrollFadeEdges } from "@/hooks/use-scroll-fades"

test("scrollFadeEdges hides both when content fits", () => {
  assert.deepEqual(scrollFadeEdges(0, 500, 500), { top: false, bottom: false })
  assert.deepEqual(scrollFadeEdges(0, 503, 500), { top: false, bottom: false })
})

test("scrollFadeEdges shows bottom only at the top of an overflowing list", () => {
  assert.deepEqual(scrollFadeEdges(0, 988, 520), { top: false, bottom: true })
})

test("scrollFadeEdges shows both when scrolled to the middle", () => {
  assert.deepEqual(scrollFadeEdges(200, 988, 520), { top: true, bottom: true })
})

test("scrollFadeEdges shows top only at the bottom", () => {
  assert.deepEqual(scrollFadeEdges(468, 988, 520), { top: true, bottom: false })
})

test("scrollFadeEdges uses 4px tolerance near edges", () => {
  // Near top: still treated as top
  assert.deepEqual(scrollFadeEdges(3, 988, 520), { top: false, bottom: true })
  assert.deepEqual(scrollFadeEdges(5, 988, 520), { top: true, bottom: true })

  // Near bottom: maxScroll = 468
  assert.deepEqual(scrollFadeEdges(465, 988, 520), { top: true, bottom: false })
  assert.deepEqual(scrollFadeEdges(463, 988, 520), { top: true, bottom: true })
})

test("scrollFadeEdges accepts a custom tolerance", () => {
  assert.deepEqual(scrollFadeEdges(8, 988, 520, 10), { top: false, bottom: true })
  assert.deepEqual(scrollFadeEdges(11, 988, 520, 10), { top: true, bottom: true })
})
