"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"

import { isThemeChoice, themeChoices, themeLabel, themeStorageKey, type ThemeChoice } from "@/lib/theme"
import { cn } from "@/lib/utils"

const changeEvent = "africa-classifieds-theme"

function readChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system"
  const stored = localStorage.getItem(themeStorageKey)
  return isThemeChoice(stored) ? stored : "system"
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && prefersDark())
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

export function writeTheme(choice: ThemeChoice) {
  localStorage.setItem(themeStorageKey, choice)
  applyTheme(choice)
  window.dispatchEvent(new Event(changeEvent))
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(changeEvent, listener)
    window.removeEventListener("storage", listener)
  }
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system")
}

function readResolved(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function subscribeResolved(listener: () => void) {
  const observer = new MutationObserver(listener)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", listener)
  window.addEventListener(changeEvent, listener)
  return () => {
    observer.disconnect()
    media.removeEventListener("change", listener)
    window.removeEventListener(changeEvent, listener)
  }
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribeResolved, readResolved, () => "light")
}

export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readChoice())
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (readChoice() === "system") applyTheme("system")
    }
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])
  return null
}

export function ThemeChoices({ className }: { className?: string }) {
  const choice = useThemeChoice()
  return (
    <div role="radiogroup" aria-label="Appearance" className={cn("grid grid-cols-3 gap-1", className)}>
      {themeChoices.map((option) => {
        const selected = choice === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => writeTheme(option)}
            className={cn(
              "h-8 rounded-full border px-2 text-xs",
              selected
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
            )}
          >
            {themeLabel(option)}
          </button>
        )
      })}
    </div>
  )
}
