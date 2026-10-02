"use client"

import { useEffect, useRef } from "react"

export function trackPromotion(promotionId: string, type: "impression" | "click") {
  void fetch("/api/promotions/events", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ promotionId, type }), keepalive: true,
  }).catch(() => { /* Metrics must not interrupt browsing. */ })
}

/** A visible card for a full second; scrolling past does not count. */
export function usePromotionImpression(id?: string) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!id || !element || typeof IntersectionObserver === "undefined") return
    let timer: ReturnType<typeof setTimeout> | undefined
    let recorded = false
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer)
      if (!recorded && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        timer = setTimeout(() => { recorded = true; trackPromotion(id, "impression"); observer.disconnect() }, 1000)
      }
    }, { threshold: [0, 0.5] })
    observer.observe(element)
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [id])
  return ref
}
