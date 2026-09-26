"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { postAdHref } from "@/lib/active-place"
import { useRememberedPlace } from "@/lib/use-remembered-place"

export function PostLink({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  const place = useRememberedPlace()
  return (
    <Link href={postAdHref(place)} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}
