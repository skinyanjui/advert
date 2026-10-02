"use client"

import Link from "next/link"

import { usePrefs } from "@/components/prefs-provider"
import { site, siteHomeLabel } from "@/lib/site"

const footerLinkClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-md px-1.5 py-1 text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring md:min-h-0"

export function SiteFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = usePrefs()
  return (
    <footer className="shrink-0 border-t border-sidebar-border bg-sidebar px-3 py-2.5 md:pb-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs text-sidebar-foreground/65">
        <p className="min-w-0 truncate tracking-wide" aria-label={siteHomeLabel()}>
          {site.name}
        </p>
        <nav className="flex flex-wrap items-center gap-0.5" aria-label={t("nav.site")}>
          <Link href="/terms" onClick={onNavigate} className={footerLinkClass}>{t("nav.terms")}</Link>
          <Link href="/privacy" onClick={onNavigate} className={footerLinkClass}>{t("nav.privacy")}</Link>
          <Link href="/help" onClick={onNavigate} className={footerLinkClass}>{t("nav.help")}</Link>
          <Link href="/contact" onClick={onNavigate} className={footerLinkClass}>{t("nav.contact")}</Link>
        </nav>
      </div>
    </footer>
  )
}
