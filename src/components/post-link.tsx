"use client"

import Link from "next/link"
import { Suspense, type ReactNode } from "react"

import { postAdHref } from "@/lib/active-place"
import { usePostingPlace } from "@/lib/use-remembered-place"

/**
 * Global Post actions use the saved onboarding/settings location first.
 * Location-specific empty states can still pass an explicit country/city to /post.
 */
export function usePostAdHref(extra?: { category?: string; type?: string }): string {
  return postAdHref(usePostingPlace(), extra)
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
  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  )
}
