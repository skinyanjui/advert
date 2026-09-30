"use client"

import { Bell, Bookmark, ChevronDown, FileText, LogOut, MessageCircle, Settings2, ShieldCheck, Tag, UserRound } from "lucide-react"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { LanguageCurrencyFields } from "@/components/language-currency-fields"
import { NavBadge } from "@/components/nav-badge"
import { usePrefs } from "@/components/prefs-provider"
import { ThemeChoices } from "@/components/theme-choices"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNavCounts } from "@/hooks/use-nav-counts"
import { useAuth } from "@/lib/auth"
import { useMarketplace } from "@/lib/marketplace"

const rowClass = "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"

export function ProfileMenu({ notifications }: { notifications: ReactNode }) {
  const auth = useAuth()
  const { savedIds, ready, refreshBoard } = useMarketplace()
  const { t } = usePrefs()
  const counts = useNavCounts()
  const unread = counts.messages ?? 0
  const attention = auth.signedIn ? counts["my-ads"] ?? 0 : 0
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await auth.signOut()
      setOpen(false)
    } catch {
      toast.error(t("auth.error.generic"))
    } finally {
      setSigningOut(false)
    }
  }

  const badgeCount = unread + attention
  const label = [
    t("nav.profile"),
    unread ? t("nav.unreadMessages", { count: unread }) : null,
    attention ? t(attention === 1 ? "nav.needsAttentionOne" : "nav.needsAttentionMany", { count: attention }) : null,
  ].filter(Boolean).join(", ")

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (next && ready) void refreshBoard()
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="relative flex size-8 items-center justify-center rounded-full border border-input bg-background text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <UserRound className="size-4" aria-hidden="true" />
          <NavBadge count={badgeCount} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        aria-label={t("nav.profile")}
        className="w-[min(23rem,calc(100vw-1.5rem))] max-h-[var(--radix-popover-content-available-height)] gap-0 overflow-y-auto rounded-2xl p-1.5 shadow-lg"
      >
        <div className="px-3 pt-3 pb-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {auth.signedIn ? auth.email ?? t("nav.signedIn") : t("nav.guestBrowser")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {!auth.ready ? t("nav.notificationsLoading") : auth.signedIn ? t("nav.signedInDetail") : t("nav.guestDetail")}
          </p>
        </div>

        {auth.ready && !auth.signedIn ? (
          <Link href="/sign-in" onClick={() => setOpen(false)} className="mx-1 mb-1 flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">
            {t("nav.signIn")}
          </Link>
        ) : null}

        <nav aria-label={t("nav.profile")} className="border-t border-border px-1 py-1.5">
          {auth.signedIn ? (
            <>
              <Link href="/account" onClick={() => setOpen(false)} className={rowClass}>
                <UserRound className="size-4" aria-hidden="true" />{t("nav.profile")}
              </Link>
              <Link href="/my-ads" onClick={() => setOpen(false)} className={rowClass}>
                <Tag className="size-4" aria-hidden="true" />
                <span className="flex-1">{t("nav.myAds")}</span>
                {attention > 0 ? <NavBadge count={attention} placement="inline" ariaLabel={t(attention === 1 ? "nav.needsAttentionOne" : "nav.needsAttentionMany", { count: attention })} /> : null}
              </Link>
            </>
          ) : null}
          {auth.signedIn ? (
            <>
              <Link href="/messages" onClick={() => setOpen(false)} className={rowClass}>
                <MessageCircle className="size-4" aria-hidden="true" />
                <span className="flex-1">{t("nav.messages")}</span>
                {unread > 0 ? <NavBadge count={unread} placement="inline" ariaLabel={t("nav.unreadMessages", { count: unread })} /> : null}
              </Link>
              <Link href="/saved" onClick={() => setOpen(false)} className={rowClass}>
                <Bookmark className="size-4" aria-hidden="true" />
                <span className="flex-1">{t("nav.saved")}</span>
                {savedIds.length > 0 ? <span className="text-xs tabular-nums text-muted-foreground">{savedIds.length}</span> : null}
              </Link>
            </>
          ) : null}
        </nav>

        {auth.signedIn ? (
          <details className="group border-t border-border px-1 py-1">
            <summary className={`${rowClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              <Bell className="size-4" aria-hidden="true" />
              <span className="flex-1">{t("nav.notifications")}</span>
              {unread > 0 ? <span className="text-xs tabular-nums text-muted-foreground">{unread}</span> : null}
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div onClickCapture={(event) => {
              if ((event.target as Element).closest("a")) setOpen(false)
            }}>
              {notifications}
            </div>
          </details>
        ) : null}

        <nav aria-label={t("nav.privacyRights")} className="border-t border-border px-1 py-1.5">
          <Link href="/privacy/choices" onClick={() => setOpen(false)} className={rowClass}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span className="flex-1">{t("nav.privacyRights")}</span>
          </Link>
          <Link href="/terms" onClick={() => setOpen(false)} className={rowClass}>
            <FileText className="size-4" aria-hidden="true" />
            <span className="flex-1">{t("nav.terms")}</span>
          </Link>
        </nav>

        <details className="group border-t border-border px-1 py-1">
          <summary className={`${rowClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            <Settings2 className="size-4" aria-hidden="true" />
            <span className="flex-1">{t("prefs.appearance")}</span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-3 px-2 py-3">
            <ThemeChoices />
            <LanguageCurrencyFields layout="menu" idPrefix="profile-menu" />
          </div>
        </details>

        {auth.signedIn ? (
          <div className="border-t border-border px-1 pt-1">
            <button type="button" disabled={signingOut} onClick={() => void signOut()} className={`${rowClass} w-full text-left text-muted-foreground disabled:opacity-50`}>
              <LogOut className="size-4" aria-hidden="true" />{t("nav.signOut")}
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
