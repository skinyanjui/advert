"use client"

import { ChevronRight, MapPin } from "lucide-react"
import Link from "next/link"

import { postAdHref } from "@/lib/active-place"
import { KeepAdsPrompt } from "@/components/sign-in-form"
import { ThemeChoices } from "@/components/theme-choices"
import { useRememberedPlace } from "@/lib/use-remembered-place"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { countryName } from "@/lib/countries"
import { useHomePlace, writeHomePlace } from "@/lib/home-place"
import { useMarketplace } from "@/lib/marketplace"
import { messageThreads, unreadMessageCount } from "@/lib/messages"

export function AccountPage() {
  const auth = useAuth()
  const { ready, admin, listings, savedIds, messages } = useMarketplace()
  const home = useHomePlace()
  const unread = unreadMessageCount(messages)
  const sellerUnread = unreadMessageCount(messages.filter((item) => item.viewerIsSeller))
  const threads = messageThreads(messages)
  const mine = listings.filter((listing) => listing.mine).length
  const homeLabel = home ? (home.city ? `${home.city}, ${countryName(home.country)}` : countryName(home.country)) : null
  const postHref = postAdHref(useRememberedPlace())
  const isAdmin = auth.signedIn && admin

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      {auth.signedIn ? (
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as {auth.email}. Your ads, saves, and messages stay with this account.
        </p>
      ) : (
        <p className="mt-1 text-sm text-neutral-500">
          Guest on this browser. Sign in to keep ads after clearing cookies or on another device.
        </p>
      )}

      {!auth.signedIn ? <KeepAdsPrompt className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" /> : null}

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium">Account</p>
        {auth.signedIn ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm text-neutral-600">{auth.email}</p>
            <Button variant="outline" className="rounded-full" onClick={() => void auth.signOut()}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-neutral-600">Email code sign-in. No password.</p>
            <Button asChild className="mt-3 rounded-full">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium">Appearance</p>
        <ThemeChoices className="mt-3" />
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Default location</p>
            {homeLabel ? (
              <p className="mt-1 text-sm text-neutral-600">{homeLabel}. Nearby ads come first on the board.</p>
            ) : (
              <p className="mt-1 text-sm text-neutral-600">
                Pick a country from the header and save it. The board then leads with ads closer to you.
              </p>
            )}
          </div>
          {home ? (
            <Button variant="outline" className="shrink-0 rounded-full" onClick={() => writeHomePlace(null)}>
              Clear
            </Button>
          ) : null}
        </div>
      </section>

      {!ready ? <p className="mt-6 text-sm text-neutral-500">Loading your profile…</p> : null}

      <ul className="mt-4 grid gap-2">
        <ProfileLink href="/messages" title="Messages" detail={messageDetail(threads.length, unread)} />
        <ProfileLink href="/saved" title="Saved ads" detail={countDetail(savedIds.length, "saved ad", "saved ads")} />
        <ProfileLink
          href="/my-ads"
          title="My ads"
          detail={myAdsDetail(mine, sellerUnread, auth.signedIn)}
        />
        <ProfileLink href={postHref} title="Post an ad" detail="Cars, houses, jobs, and everything else on the board." />
        {isAdmin ? (
          <ProfileLink href="/admin/reports" title="Reports" detail="Review reported ads as an admin." />
        ) : null}
      </ul>
    </div>
  )
}

function ProfileLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-400"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-0.5 block text-xs text-neutral-500">{detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-neutral-400" />
      </Link>
    </li>
  )
}

function messageDetail(threads: number, unread: number): string {
  if (threads === 0) return "No conversations yet. Write to a seller from a listing."
  if (unread === 0) return threads === 1 ? "1 conversation" : `${threads} conversations`
  return unread === 1 ? "1 unread reply" : `${unread} unread replies`
}

function countDetail(count: number, singular: string, plural: string): string {
  if (count === 0) return `No ${plural} yet`
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

function myAdsDetail(mine: number, sellerUnread: number, signedIn: boolean): string {
  const base = countDetail(
    mine,
    signedIn ? "ad on your account" : "ad on this browser",
    signedIn ? "ads on your account" : "ads on this browser",
  )
  if (sellerUnread === 0) return base
  return `${base} · ${sellerUnread === 1 ? "1 unread message" : `${sellerUnread} unread messages`}`
}
