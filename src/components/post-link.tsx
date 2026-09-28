"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { postAdHref } from "@/lib/active-place"
import { useRememberedPlace } from "@/lib/use-remembered-place"

export function PostLink({
  children,
  className,
  ariaLabel,
  onClick,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
  onClick?: () => void
}) {
  const place = useRememberedPlace()
  return (
    <Link href={postAdHref(place)} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  )
}
