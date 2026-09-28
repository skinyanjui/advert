import Link from "next/link"

import { site, siteHomeLabel } from "@/lib/site"
import { cn } from "@/lib/utils"

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={iconOnly ? siteHomeLabel() : undefined}
      className={cn("flex h-14 shrink-0 items-center gap-2 self-stretch px-2 text-neutral-950 md:h-auto md:px-3", className)}
    >
      <svg
        viewBox="0 0 15 15"
        aria-hidden="true"
        className="size-7"
      >
        <path
          fill="currentColor"
          d="m3.75.5l.82-.5H6l.25.5L6 1h1l1 .5V1h.5l1.25.5l.75-.25l.5.25V2l-.5.5L10 2l1.87 2.68l1.22 1.04l1.41-.34V6l-1.16 1.53l-.91.39l-.56.9l.28 1.9l-1.1.89v1l-.47.37v.45l-.58.82l-.5.5l-.88.01L8 15h-.25l-.35-.52v-.54l-.38-1.76l-.66-.88l.66-1.65l-1.23-1.73l.39-.98h-.93l-.47-.66l-1.08.66l-.59-.29l-.69.29l-.88-.66v-.56L.5 5.5v-.75L1 4l-.5-.5l.75-1.25L2 1.5V1l1-.75z"
        />
      </svg>
      {iconOnly ? null : (
        <span className="min-w-0 truncate text-[17px] leading-none font-semibold tracking-tight whitespace-nowrap">
          {site.name}
        </span>
      )}
    </Link>
  )
}
