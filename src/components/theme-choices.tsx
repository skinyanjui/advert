"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react"

import { usePrefs } from "@/components/prefs-provider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { MessageKey } from "@/lib/i18n"
import { isThemeChoice, themeChoices, themeStorageKey, type ThemeChoice } from "@/lib/theme"

function themeMessageKey(choice: ThemeChoice): MessageKey {
  switch (choice) {
    case "light":
      return "theme.light"
    case "dark":
      return "theme.dark"
    case "system":
      return "theme.system"
    default: {
      const unreachable: never = choice
      return unreachable
    }
  }
}

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
  const { t } = usePrefs()
  return (
    <ToggleGroup
      type="single"
      value={choice}
      variant="outline"
      spacing={0}
      aria-label={t("prefs.appearance")}
      className={className}
      onValueChange={(value) => {
        if (isThemeChoice(value)) writeTheme(value)
      }}
    >
      {themeChoices.map((option) => {
        const label = t(themeMessageKey(option))
        return (
          <ToggleGroupItem
            key={option}
            value={option}
            aria-label={label}
            title={label}
            className="px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <ThemeIcon choice={option} />
            <span className="sr-only">{label}</span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  switch (choice) {
    case "light":
      return <Sun />
    case "dark":
      return <Moon />
    case "system":
      return <Monitor />
    default: {
      const unreachable: never = choice
      return unreachable as ReactNode
    }
  }
}
