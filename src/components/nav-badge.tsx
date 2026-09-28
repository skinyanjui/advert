"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Compact numeric pill for nav. Hidden at 0; caps display at 9+. */
export function NavBadge({
  count,
  className,
  placement = "corner",
  ariaLabel,
}: {
  count: number
  className?: string
  /** `corner` overlays an icon button; `inline` sits beside a text label. */
  placement?: "corner" | "inline"
  /** When set, announced by the badge; otherwise treated as decorative (parent owns aria). */
  ariaLabel?: string
}) {
  if (!count || count < 1) return null
  const label = count > 9 ? "9+" : String(count)
  return (
    <Badge
      variant="destructive"
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        "pointer-events-none h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none tabular-nums",
        placement === "corner" ? "absolute -top-1 -right-1" : "static shrink-0",
        className,
      )}
    >
      {label}
    </Badge>
  )
}
