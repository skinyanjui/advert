import Link from "next/link"

import { navItem } from "@/lib/nav"
import { site, siteHomeLabel, siteSupportMailto } from "@/lib/site"

const footerLinkClass =
  "shrink-0 rounded-md px-1.5 py-1 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"

export function SiteFooter({ onNavigate }: { onNavigate?: () => void }) {
  const credits = navItem("credits")
  const contactHref = siteSupportMailto()
  return (
    <footer className="shrink-0 border-t border-sidebar-border bg-sidebar px-3 py-2.5 md:pb-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs text-neutral-500">
        <p className="min-w-0 truncate tracking-wide" aria-label={siteHomeLabel()}>
          {site.name}
        </p>
        <nav className="flex flex-wrap items-center gap-0.5" aria-label="Site">
          <Link href="/terms" onClick={onNavigate} className={footerLinkClass}>
            Terms
          </Link>
          <Link href="/privacy" onClick={onNavigate} className={footerLinkClass}>
            Privacy
          </Link>
          {contactHref ? (
            <a href={contactHref} onClick={onNavigate} className={footerLinkClass}>
              Contact
            </a>
          ) : null}
          <Link href={credits.href} onClick={onNavigate} className={footerLinkClass}>
            {credits.label}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
