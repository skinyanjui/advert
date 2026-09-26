"use client"

import { useSyncExternalStore } from "react"

import { formatLocalTime } from "@/lib/countries"

export function useClientTime(timeZone: string): string | null {
  return useSyncExternalStore(
    subscribeClock,
    () => formatLocalTime(timeZone),
    () => null,
  )
}

function subscribeClock() {
  return () => {}
}
