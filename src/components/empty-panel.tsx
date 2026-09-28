import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Dashed empty-state panel used across collections / admin / similar pages. */
export function EmptyPanel({
  title,
  body,
  actionHref,
  actionLabel,
  className,
  children,
  headingLevel = 2,
}: {
  title: string
  body?: string
  actionHref?: string
  actionLabel?: string
  className?: string
  children?: ReactNode
  headingLevel?: 1 | 2
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2"
  return (
    <div
      className={cn(
        "mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center",
        className,
      )}
    >
      <Heading
        className={cn(
          "font-semibold tracking-tight",
          headingLevel === 1 ? "text-xl" : "text-lg",
        )}
      >
        {title}
      </Heading>
      {body ? <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">{body}</p> : null}
      {children}
      {actionHref && actionLabel ? (
        <Button asChild className="mt-5 rounded-full">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
