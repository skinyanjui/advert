"use client"

import Link from "next/link"
import { Suspense, type ReactNode } from "react"

import { postAdHref } from "@/lib/active-place"
import { canonicalCountry } from "@/lib/countries"
import { useRememberedPlace } from "@/lib/use-remembered-place"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Same place resolution as the header Post button:
 * current board query country/city when set, otherwise remembered place.
 */
export function usePostAdHref(extra?: { category?: string; type?: string }): string {
  const searchParams = useSearchParams()
  const remembered = useRememberedPlace()
  const country = canonicalCountry(searchParams.get("country"))
  const city = searchParams.get("city")?.trim() || undefined
  return postAdHref(country ? { country, city } : remembered, extra)
}

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
  return (
    <Suspense
      fallback={
        <Link href="/post" className={className} aria-label={ariaLabel} onClick={onClick}>
          {children}
        </Link>
      }
    >
      <PostLinkInner className={className} ariaLabel={ariaLabel} onClick={onClick}>
        {children}
      </PostLinkInner>
    </Suspense>
  )
}

function PostLinkInner({
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
  const href = usePostAdHref()
  // Touch pathname so the link stays in sync when the board route changes.
  usePathname()
  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  )
}
