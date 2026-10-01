"use client"

import Link from "next/link"
import { Suspense, type ReactNode } from "react"

import { postAdHref } from "@/lib/active-place"

/**
 * Global Post actions intentionally do not encode device-local location.
 * The post form resolves the signed-in profile first. Location-specific actions
 * can still use postAdHref(place, extra) directly.
 */
export function usePostAdHref(extra?: { category?: string; type?: string }): string {
  return postAdHref(null, extra)
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
