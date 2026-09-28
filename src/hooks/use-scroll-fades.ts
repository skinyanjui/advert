"use client"

import { useEffect, useState, type RefObject } from "react"

const DEFAULT_TOLERANCE = 4

export type ScrollFadeEdges = {
  top: boolean
  bottom: boolean
}

export type HorizontalScrollFadeEdges = {
  left: boolean
  right: boolean
}

/** Pure calc for whether a scroller has overflow past the top/bottom edges. */
export function scrollFadeEdges(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  tolerance: number = DEFAULT_TOLERANCE,
): ScrollFadeEdges {
  const maxScroll = scrollHeight - clientHeight
  if (maxScroll <= tolerance) {
    return { top: false, bottom: false }
  }
  return {
    top: scrollTop > tolerance,
    bottom: scrollTop < maxScroll - tolerance,
  }
}

/** Pure calc for whether a scroller has overflow past the left/right edges. */
export function horizontalScrollFadeEdges(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  tolerance: number = DEFAULT_TOLERANCE,
): HorizontalScrollFadeEdges {
  const maxScroll = scrollWidth - clientWidth
  if (maxScroll <= tolerance) {
    return { left: false, right: false }
  }
  return {
    left: scrollLeft > tolerance,
    right: scrollLeft < maxScroll - tolerance,
  }
}

function readFadeEdges(el: HTMLElement, tolerance: number): ScrollFadeEdges {
  return scrollFadeEdges(el.scrollTop, el.scrollHeight, el.clientHeight, tolerance)
}

function readHorizontalFadeEdges(el: HTMLElement, tolerance: number): HorizontalScrollFadeEdges {
  return horizontalScrollFadeEdges(el.scrollLeft, el.scrollWidth, el.clientWidth, tolerance)
}

type UseScrollFadesOptions = {
  tolerance?: number
}

/**
 * Tracks whether a scroll container can scroll further up (`top`) or down (`bottom`).
 * Updates on scroll and when the scroller or its inner content resizes (e.g. expanded types).
 */
export function useScrollFades(
  ref: RefObject<HTMLElement | null>,
  options: UseScrollFadesOptions = {},
): ScrollFadeEdges {
  const { tolerance = DEFAULT_TOLERANCE } = options
  const [edges, setEdges] = useState<ScrollFadeEdges>({ top: false, bottom: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setEdges(readFadeEdges(el, tolerance))
    }

    update()
    el.addEventListener("scroll", update, { passive: true })

    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Prefer a stable inner wrapper so Suspense swaps still resize-observe.
    const inner = el.firstElementChild ?? el.querySelector("nav")
    if (inner) ro.observe(inner)

    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [ref, tolerance])

  return edges
}

/**
 * Tracks whether a horizontal scroll container can scroll further left or right.
 * Updates on scroll and when the scroller or its children resize.
 */
export function useHorizontalScrollFades(
  ref: RefObject<HTMLElement | null>,
  options: UseScrollFadesOptions = {},
): HorizontalScrollFadeEdges {
  const { tolerance = DEFAULT_TOLERANCE } = options
  const [edges, setEdges] = useState<HorizontalScrollFadeEdges>({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setEdges(readHorizontalFadeEdges(el, tolerance))
    }

    update()
    el.addEventListener("scroll", update, { passive: true })

    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const child of el.children) {
      ro.observe(child)
    }

    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [ref, tolerance])

  return edges
}
