import Link from "next/link"

import { PostLink } from "@/components/post-link"

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-4 px-4 py-4 text-xs text-neutral-500 md:px-6">
        <span className="shrink-0">africa classifieds</span>
        <nav aria-label="Footer" className="flex items-center gap-4 whitespace-nowrap">
          <Link href="/" className="hover:text-neutral-950">Browse</Link>
          <PostLink className="hover:text-neutral-950">Post ad</PostLink>
          <Link href="/credits" className="hover:text-neutral-950">Credits</Link>
        </nav>
      </div>
    </footer>
  )
}
