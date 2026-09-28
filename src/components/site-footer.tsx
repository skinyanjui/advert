import Link from "next/link"

import { PostLink } from "@/components/post-link"

const linkClass = "rounded-md px-2 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-neutral-950"

export function SiteFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <footer className="shrink-0 border-t border-neutral-200 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <nav aria-label="More pages" className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-sm">
        <Link href="/" onClick={onNavigate} className={linkClass}>Browse</Link>
        <PostLink onClick={onNavigate} className={linkClass}>Post ad</PostLink>
        <Link href="/messages" onClick={onNavigate} className={linkClass}>Inbox</Link>
        <Link href="/saved" onClick={onNavigate} className={linkClass}>Saved ads</Link>
        <Link href="/my-ads" onClick={onNavigate} className={linkClass}>My ads</Link>
        <Link href="/account" onClick={onNavigate} className={linkClass}>Account</Link>
        <Link href="/credits" onClick={onNavigate} className={linkClass}>Credits</Link>
      </nav>
      <p className="mt-3 px-2 text-xs text-neutral-500">africa classifieds</p>
    </footer>
  )
}
