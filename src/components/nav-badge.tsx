"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Compact numeric pill for nav icons. Hidden at 0; caps display at 9+. */
export function NavBadge({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (!count || count < 1) return null
  const label = count > 9 ? "9+" : String(count)
  return (
    <Badge
      variant="destructive"
      className={cn(
        "pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none tabular-nums",
        className,
      )}
    >
      {label}
    </Badge>
  )
}
