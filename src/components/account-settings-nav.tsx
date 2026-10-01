"use client"

import { LockKeyhole, Palette, ShieldCheck, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"

const items = [
  { href: "#profile", label: "Profile", description: "Identity and contact", icon: UserRound },
  { href: "#preferences", label: "Preferences", description: "Appearance and locale", icon: Palette },
  { href: "#security", label: "Security", description: "Email, password, sessions", icon: LockKeyhole },
  { href: "#privacy", label: "Privacy", description: "Data and privacy controls", icon: ShieldCheck },
] as const

export function AccountSettingsNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Settings sections" className={cn("-mx-3 overflow-x-auto px-3 md:mx-0 md:overflow-visible md:px-0", className)}>
      <div className="flex min-w-max gap-1 md:min-w-0 md:flex-col">
        {items.map(({ href, label, description, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 md:w-full"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
            <span className="text-left">
              <span className="block font-medium text-foreground">{label}</span>
              <span className="hidden text-xs text-muted-foreground md:block">{description}</span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  )
}
