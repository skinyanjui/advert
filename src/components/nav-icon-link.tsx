"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps } from "react"

import { NavBadge } from "@/components/nav-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { useNavCounts, navCountAriaLabel } from "@/hooks/use-nav-counts"
import { navItem, type NavItemId } from "@/lib/nav"
import { cn } from "@/lib/utils"

type NavIconLinkProps = {
  id: NavItemId
  className?: string
  /** Extra classes on the inner Link when using Button asChild. */
  linkClassName?: string
} & Pick<ComponentProps<typeof Button>, "variant" | "size">

/**
 * Shared icon nav control: nav config + optional NavBadge from useNavCounts.
 * Used by header / mobile dock / fallback so badge styling stays one place.
 */
export function NavIconLink({
  id,
  className,
  linkClassName,
  variant = "outline",
  size = "icon-lg",
}: NavIconLinkProps) {
  const pathname = usePathname()
  const counts = useNavCounts()
  const item = navItem(id)
  const count = counts[id] ?? 0
  const Icon = item.icon

  return (
    <Button asChild variant={variant} size={size} className={cn("relative rounded-full", className)}>
      <Link
        href={item.href}
        aria-label={navCountAriaLabel(item.label, id, counts)}
        aria-current={pathname === item.href ? "page" : undefined}
        className={linkClassName}
      >
        <Icon />
        <span className="sr-only">{item.label}</span>
        <NavBadge count={count} />
      </Link>
    </Button>
  )
}

export function navItemButtonClass(extra?: string) {
  return cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "relative rounded-full", extra)
}
