"use client"

import { useSyncExternalStore } from "react"

import { formatLocalTime } from "@/lib/countries"

/** Stable client clock captured on first client snapshot (null during SSR / hydration). */
let clientNowSnapshot: number | undefined

/** True after hydration; getServerSnapshot is false so SSR and first paint match. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNothing, () => true, () => false)
}

/** Wall clock on the client; null during SSR / hydration snapshot. */
export function useClientNow(): number | null {
  return useSyncExternalStore(subscribeNothing, readClientNow, () => null)
}

export function useClientTime(timeZone: string): string | null {
  return useSyncExternalStore(
    subscribeNothing,
    () => formatLocalTime(timeZone),
    () => null,
  )
}

function readClientNow(): number {
  if (clientNowSnapshot === undefined) clientNowSnapshot = Date.now()
  return clientNowSnapshot
}

function subscribeNothing() {
  return () => {}
}
