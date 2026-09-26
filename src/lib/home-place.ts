"use client"

import { useSyncExternalStore } from "react"

import { canonicalCountry } from "@/lib/countries"

const storageKey = "africa-classifieds-home"
const anywhereKey = "africa-classifieds-anywhere"
const changeEvent = "africa-classifieds-home"
const everywhereEvent = "africa-classifieds-everywhere"

export type HomePlace = {
  country: string
  city?: string
}

function parseHome(raw: string | null): HomePlace | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { country?: unknown; city?: unknown }
    const country = canonicalCountry(typeof parsed.country === "string" ? parsed.country : undefined)
    if (!country) return null
    const city = typeof parsed.city === "string" ? parsed.city.trim() : ""
    return city ? { country, city } : { country }
  } catch {
    return null
  }
}

let cachedRaw: string | null | undefined
let cachedPlace: HomePlace | null = null

export function readHomePlace(): HomePlace | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(storageKey)
  if (raw === cachedRaw) return cachedPlace
  cachedRaw = raw
  cachedPlace = parseHome(raw)
  return cachedPlace
}

export function writeHomePlace(place: HomePlace | null) {
  if (place) localStorage.setItem(storageKey, JSON.stringify(place))
  else localStorage.removeItem(storageKey)
  cachedRaw = localStorage.getItem(storageKey)
  cachedPlace = parseHome(cachedRaw)
  window.dispatchEvent(new Event(changeEvent))
}

function serverHome(): HomePlace | null {
  return null
}

export function markBrowsingEverywhere() {
  sessionStorage.setItem(anywhereKey, "1")
  window.dispatchEvent(new Event(everywhereEvent))
}

export function clearBrowsingEverywhere() {
  sessionStorage.removeItem(anywhereKey)
  window.dispatchEvent(new Event(everywhereEvent))
}

export function isBrowsingEverywhere(): boolean {
  return sessionStorage.getItem(anywhereKey) === "1"
}

function subscribeEverywhere(listener: () => void) {
  window.addEventListener(everywhereEvent, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(everywhereEvent, listener)
    window.removeEventListener("storage", listener)
  }
}

export function useBrowsingEverywhere(): boolean {
  return useSyncExternalStore(subscribeEverywhere, isBrowsingEverywhere, () => false)
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(changeEvent, listener)
    window.removeEventListener("storage", listener)
  }
}

export function useHomePlace(): HomePlace | null {
  return useSyncExternalStore(subscribe, readHomePlace, serverHome)
}
