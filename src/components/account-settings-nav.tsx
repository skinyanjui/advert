"use client"

import { LockKeyhole, Palette, ShieldCheck, Trash2, UserRound } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const items = [
  { href: "#profile", label: "Profile", description: "Identity and contact", icon: UserRound },
  { href: "#preferences", label: "Preferences", description: "Appearance and locale", icon: Palette },
  { href: "#security", label: "Security", description: "Email, password, sessions", icon: LockKeyhole },
  { href: "#privacy", label: "Privacy", description: "Data and privacy controls", icon: ShieldCheck },
  { href: "#account-management", label: "Account", description: "Permanent account actions", icon: Trash2 },
] as const

export function AccountSettingsNav({ className }: { className?: string }) {
  const [activeHref, setActiveHref] = useState<(typeof items)[number]["href"]>("#profile")

  useEffect(() => {
    const sections = items
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const href = `#${visible.target.id}` as (typeof items)[number]["href"]
        if (items.some((item) => item.href === href)) setActiveHref(href)
      },
      { rootMargin: "-24% 0px -62% 0px", threshold: [0, 0.25, 0.6] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        "sticky top-14 z-30 -mx-3 overflow-x-auto border-y border-border/70 bg-background/95 px-3 py-1 backdrop-blur-md md:top-24 md:mx-0 md:overflow-visible md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none",
        className,
      )}
    >
      <div className="flex min-w-max gap-1 md:min-w-0 md:flex-col">
        {items.map(({ href, label, description, icon: Icon }) => {
          const active = activeHref === href
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "location" : undefined}
              onClick={() => setActiveHref(href)}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 md:w-full",
                active && "bg-muted font-medium",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground",
                  active && "text-foreground",
                )}
                aria-hidden="true"
              />
              <span className="text-left">
                <span className="block font-medium text-foreground">{label}</span>
                <span className="hidden text-xs text-muted-foreground md:block">{description}</span>
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
