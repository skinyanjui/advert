"use client"

import { useSyncExternalStore } from "react"

import { readActivePlace, subscribeActivePlace, type ActivePlace } from "@/lib/active-place"
import { useBrowsingEverywhere, useHomePlace } from "@/lib/home-place"

function serverPlace(): ActivePlace | null {
  return null
}

/** Country and city carried across the site: the last board selection, or the saved default. */
export function useRememberedPlace(): ActivePlace | null {
  const active = useSyncExternalStore(subscribeActivePlace, readActivePlace, serverPlace)
  const home = useHomePlace()
  const everywhere = useBrowsingEverywhere()
  if (!everywhere && active) return active
  if (home) return home
  return null
}
