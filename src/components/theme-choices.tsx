"use client"

import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isThemeChoice, themeChoices, themeLabel, themeStorageKey, type ThemeChoice } from "@/lib/theme"

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


export function ThemeMenu() {
  const choice = useThemeChoice()
  const resolved = useResolvedTheme()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Appearance"
          title="Appearance"
          className="flex size-8 items-center justify-center rounded-full border border-input bg-background text-foreground outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
        >
          {resolved === "dark" ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        aria-label="Appearance"
        className="w-36 gap-0 rounded-xl p-1.5 shadow-lg"
      >
        <div role="menu" aria-label="Appearance">
          {themeChoices.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={choice === option}
              onClick={() => writeTheme(option)}
              className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-4 items-center justify-center" aria-hidden="true">
                <ThemeIcon choice={option} />
              </span>
              <span className="flex-1">{themeLabel(option)}</span>
              <span className="flex size-4 items-center justify-center">
                {choice === option ? <Check className="size-4" aria-hidden="true" /> : null}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ThemeChoices({ className }: { className?: string }) {
  const choice = useThemeChoice()
  return (
    <ToggleGroup
      type="single"
      value={choice}
      variant="outline"
      spacing={0}
      aria-label="Appearance"
      className={className}
      onValueChange={(value) => {
        if (isThemeChoice(value)) writeTheme(value)
      }}
    >
      {themeChoices.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          aria-label={themeLabel(option)}
          title={themeLabel(option)}
          className="px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <ThemeIcon choice={option} />
          <span className="sr-only">{themeLabel(option)}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  switch (choice) {
    case "light":
      return <Sun className="size-4" />
    case "dark":
      return <Moon className="size-4" />
    case "system":
      return <Monitor className="size-4" />
    default: {
      const unreachable: never = choice
      return unreachable as ReactNode
    }
  }
}
