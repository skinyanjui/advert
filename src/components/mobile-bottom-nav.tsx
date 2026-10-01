"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavBadge } from "@/components/nav-badge"
import { PostLink } from "@/components/post-link"
import { navCountAriaLabel, useNavCounts } from "@/hooks/use-nav-counts"
import { navItem, type NavItemId } from "@/lib/nav"
import { cn } from "@/lib/utils"

const mobileTabs: NavItemId[] = ["home", "saved", "post", "messages", "profile"]

export function MobileBottomNav() {
  const pathname = usePathname()
  const counts = useNavCounts()
  const accountActivity = (counts.saved ?? 0) + (counts.messages ?? 0) + (counts["my-ads"] ?? 0)

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-border/70 bg-background/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch px-1">
        {mobileTabs.map((id) => {
          const item = navItem(id)
          const Icon = item.icon
          const active = isActive(pathname, id, item.href)
          const count = id === "profile" ? accountActivity : counts[id] ?? 0
          const label = id === "profile" && accountActivity
            ? `${item.shortLabel}, ${accountActivity} account activities`
            : navCountAriaLabel(item.shortLabel, id, counts)

          if (id === "post") {
            return (
              <PostLink
                key={id}
                ariaLabel={item.label}
                className="group flex min-w-0 flex-col items-center justify-center gap-0.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95">
                  <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="text-[10px] font-medium leading-none">Post</span>
              </PostLink>
            )
          }

          return (
            <Link
              key={id}
              href={item.href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-w-0 flex-col items-center justify-center gap-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative flex h-7 items-center justify-center">
                <Icon className="size-6" strokeWidth={active ? 2.35 : 1.8} aria-hidden="true" />
                {count > 0 && (id === "saved" || id === "messages" || id === "profile") ? (
                  <NavBadge count={count} className="-top-1.5 -right-2" />
                ) : null}
              </span>
              <span className={cn("truncate text-[10px] leading-none", active && "font-semibold")}>
                {id === "messages" ? "Inbox" : item.shortLabel}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function isActive(pathname: string, id: NavItemId, href: string) {
  if (id === "home") return pathname === "/" || pathname.startsWith("/listings/")
  return pathname === href || pathname.startsWith(`${href}/`)
}
