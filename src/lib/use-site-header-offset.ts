"use client"

import { useLayoutEffect } from "react"

/** Keeps --site-header-offset in sync so mobile board chrome can stick below the header. */
export function useSiteHeaderOffset() {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]")
    if (!header) return

    const sync = () => {
      const height = Math.ceil(header.getBoundingClientRect().height)
      document.documentElement.style.setProperty("--site-header-offset", `${height}px`)
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(header)
    window.addEventListener("resize", sync)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", sync)
    }
  }, [])
}
