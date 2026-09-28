"use client"

import { Bell, ChevronDown, Inbox, MapPin, MessageCircle, Plus, RefreshCw, Search, UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { postAdHref } from "@/lib/active-place"
import { Logo } from "@/components/logo"
import { CategoryTopNav } from "@/components/category-top-nav"
import { PostLink } from "@/components/post-link"
import { ThemeChoices } from "@/components/theme-choices"
import { useRememberedPlace } from "@/lib/use-remembered-place"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { searchCitiesAnywhere } from "@/lib/cities"
import { countries, countryName, fold, moreCountries, primaryCountries } from "@/lib/countries"
import { clearBrowsingEverywhere, markBrowsingEverywhere, useHomePlace, writeHomePlace } from "@/lib/home-place"
import { useMarketplace } from "@/lib/marketplace"
import { recentMessageNotifications, unreadMessageCount } from "@/lib/messages"
import { categoryFromPath, useListingQuery, type ListingQuery } from "@/lib/use-listing-query"
import { cn } from "@/lib/utils"

const summaryClass =
  "menu-summary cursor-pointer list-none rounded-full [&::-webkit-details-marker]:hidden [&::marker]:content-none"

export function SiteHeader() {
  const pathname = usePathname()
  const { query, update } = useListingQuery()
  const { savedIds, messages } = useMarketplace()
  const auth = useAuth()
  const unreadMessages = unreadMessageCount(messages)
  const sellerUnread = unreadMessageCount(messages.filter((item) => item.viewerIsSeller))
  const locationLabel = query.country ? countryName(query.country) : "All Africa"
  const remembered = useRememberedPlace()
  const postHref = postAdHref(query.country ? { country: query.country, city: query.city } : remembered)
  const profileLabel = auth.signedIn ? auth.email ?? "Signed in" : "Guest on this browser"
  const profileDetail = auth.signedIn ? "Ads stay with your account" : "Sign in to keep ads across devices"
  return (
    <header data-site-header className="sticky top-0 z-50">
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center gap-1 px-2 md:relative md:h-[72px] md:gap-3 md:px-5 xl:gap-6 xl:px-8">
          <Logo iconOnly className="xl:hidden" />
          <Logo className="hidden xl:flex" />
          <div className="relative mx-auto flex min-w-0 flex-1 items-center gap-1 px-1 md:max-w-[680px] md:gap-2 md:px-0">
            <div className="min-w-0 flex-1">
              <SearchField value={query.q} onChange={(value) => update({ q: value })} />
            </div>
            <div className="shrink-0">
              <CategoryTopNav />
            </div>
          </div>
          <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-lg items-center justify-between rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-lg md:static md:inset-auto md:ml-auto md:max-w-none md:shrink-0 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <nav aria-label="Navigation" className="flex w-full items-center justify-between gap-1 md:justify-end md:gap-2 lg:gap-3">
              <CountryMenu label={locationLabel} query={query} />
              <Button asChild className="h-10 rounded-full bg-neutral-950 px-3 text-white hover:bg-neutral-800 md:px-3 xl:px-4">
                <Link href={postHref} aria-label="Post ad">
                  <Plus />
                  <span className="hidden xl:inline">Post ad</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="icon-lg" className="relative rounded-full">
                <Link
                  href="/messages"
                  aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                  aria-current={pathname === "/messages" ? "page" : undefined}
                >
                  <MessageCircle />
                  {unreadMessages > 0 ? <UnreadDot /> : null}
                </Link>
              </Button>
              <NotificationsMenu />
              <HeaderMenu
                label="Profile"
                summaryClassName="relative size-9 px-0"
                panelClassName="w-56"
                summary={
                  <>
                    <UserRound />
                    {unreadMessages > 0 ? <UnreadDot /> : null}
                  </>
                }
              >
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium">{profileLabel}</p>
                  <p className="text-xs text-neutral-500">{profileDetail}</p>
                  <ThemeChoices className="mt-2" />
                </div>
                <div className="mx-1 my-1 h-px bg-neutral-200" />
                {auth.signedIn ? null : <MenuLink href="/sign-in">Sign in</MenuLink>}
                <MenuLink href="/account">Profile</MenuLink>
                <MenuLink href="/messages">
                  Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}
                </MenuLink>
                <MenuLink href="/saved">Saved ads ({savedIds.length})</MenuLink>
                <MenuLink href="/my-ads">
                  My ads{sellerUnread > 0 ? ` (${sellerUnread} unread)` : ""}
                </MenuLink>
                <MenuLink href={postHref}>Post an ad</MenuLink>
                {auth.signedIn ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex h-8 w-full cursor-pointer items-center rounded-md px-2 text-left text-sm hover:bg-neutral-100"
                    onClick={() => void auth.signOut()}
                  >
                    Sign out
                  </button>
                ) : null}
              </HeaderMenu>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

function NotificationsMenu() {
  const { messages, ready, reloadBoard } = useMarketplace()
  const [view, setView] = useState<"all" | "unread">("all")
  const unread = unreadMessageCount(messages)
  const notifications = recentMessageNotifications(messages, 8)
  const visible = view === "unread" ? notifications.filter((item) => !item.read) : notifications

  return (
    <HeaderMenu
      label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      summaryClassName="relative size-9 px-0"
      panelClassName="w-[min(23rem,calc(100vw-1rem))] !p-0"
      panelRole="region"
      onOpen={() => { if (ready) void reloadBoard() }}
      summary={<><Bell />{unread > 0 ? <UnreadDot /> : null}</>}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-950">Notifications</h2>
          <p className="text-xs text-neutral-500" aria-live="polite">
            {unread > 0 ? `${unread} unread ${unread === 1 ? "message" : "messages"}` : "Your recent message activity"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh notifications"
          title="Refresh notifications"
          disabled={!ready}
          onClick={() => void reloadBoard()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", !ready && "animate-spin")} aria-hidden="true" />
        </button>
      </div>
      <div className="flex gap-1 border-b border-neutral-200 px-3 py-2" aria-label="Filter notifications">
        {(["all", "unread"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              view === option ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {option === "all" ? "All" : `Unread${unread ? ` ${unread}` : ""}`}
          </button>
        ))}
      </div>
      <div className="max-h-[min(21rem,calc(100dvh-16rem))] min-h-40 overflow-y-auto p-2">
        {!ready && notifications.length === 0 ? (
          <p role="status" className="px-3 py-10 text-center text-sm text-neutral-500">Loading notifications…</p>
        ) : null}
        {ready && visible.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-5 py-7 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
              <Inbox className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-neutral-950">
              {view === "unread" ? "You're all caught up" : "Nothing here yet"}
            </p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-neutral-500">
              {view === "unread" ? "New replies and inquiries will appear here." : "Messages from buyers and sellers will appear here."}
            </p>
          </div>
        ) : null}
        {visible.length > 0 ? (
          <ul className="space-y-0.5">
            {visible.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/messages?c=${encodeURIComponent(item.conversationId)}`}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-3 outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-950",
                    !item.read && "bg-neutral-50",
                  )}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-neutral-200">
                    <MessageCircle className="size-4 text-neutral-700" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="sr-only">{item.read ? "Read: " : "Unread: "}</span>
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("min-w-0 truncate text-sm", item.read ? "text-neutral-700" : "font-semibold text-neutral-950")}>
                        {item.viewerIsSeller ? "New inquiry" : "Seller reply"}
                      </span>
                      {!item.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-neutral-950" aria-hidden="true" /> : null}
                    </span>
                    <span className="block truncate text-xs font-medium text-neutral-600">{item.listingTitle}</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{item.body}</span>
                    <time dateTime={item.sentAt} className="mt-1 block text-[11px] text-neutral-400">
                      {new Date(item.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="border-t border-neutral-200 p-2">
        <Link href="/messages" className="flex h-9 items-center justify-center rounded-full text-xs font-medium text-neutral-700 hover:bg-neutral-100">
          Open inbox
        </Link>
      </div>
    </HeaderMenu>
  )
}

function CountryMenu({ label, query }: { label: string; query: ListingQuery }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const home = useHomePlace()
  const [locationQuery, setLocationQuery] = useState("")
  const search = searchParams.toString()
  const homeLabel = home ? placeLabel(home.country, home.city) : undefined
  const currentLabel = query.country ? placeLabel(query.country, query.city) : undefined
  const canSaveDefault = !!currentLabel && currentLabel !== homeLabel
  const router = useRouter()
  const featured = primaryCountries()
  const rest = moreCountries()
  const matches = filterCountries(locationQuery)
  const cityHits = searchCitiesAnywhere(locationQuery, 6)
  const searching = locationQuery.trim().length > 0

  function choosePlace(country: string | null, city?: string | null) {
    if (country) clearBrowsingEverywhere()
    else markBrowsingEverywhere()
    router.push(locationHref(pathname, search, country, city))
  }

  return (
    <HeaderMenu
      label={`Country: ${label}`}
      summaryClassName="h-10 px-2.5 sm:max-w-48 sm:px-3 lg:max-w-44"
      panelClassName="w-64"
      onOpen={() => setLocationQuery("")}
      summary={
        <>
          <MapPin className="size-4 shrink-0 text-neutral-500" />
          <span className="hidden max-w-32 truncate sm:inline md:hidden lg:inline">{label}</span>
          <ChevronDown className="hidden size-4 shrink-0 text-neutral-400 group-open:rotate-180 sm:block" />
        </>
      }
    >
      <div className="p-1">
        <Input
          value={locationQuery}
          onChange={(event) => setLocationQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !searching) return
            event.preventDefault()
            const exactCountry = matches.find(
              (country) =>
                fold(country.name) === fold(locationQuery) || country.code.toLowerCase() === locationQuery.trim().toLowerCase(),
            )
            const exactCity = cityHits.find((city) => fold(city.name) === fold(locationQuery))
            if (exactCountry) {
              choosePlace(exactCountry.code)
              return
            }
            if (exactCity) {
              choosePlace(exactCity.country, exactCity.name)
              return
            }
            const country = matches[0]
            if (country) {
              choosePlace(country.code)
              return
            }
            const city = cityHits[0]
            if (city) choosePlace(city.country, city.name)
          }}
          placeholder="Country, capital, or city"
          aria-label="Search countries and cities"
          className="h-8"
        />
      </div>
      <div className="mx-1 my-1 h-px bg-neutral-200" />
      {home ? (
        <MenuLink
          href={locationHref(pathname, search, home.country, home.city ?? null)}
          onClick={() => clearBrowsingEverywhere()}
        >
          <span className="min-w-0 flex-1 truncate">{homeLabel}</span>
          <span className="text-[11px] text-neutral-400">Default</span>
        </MenuLink>
      ) : null}
      {canSaveDefault ? (
        <button
          type="button"
          role="menuitem"
          className="flex h-auto w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
          onClick={() => {
            if (!query.country) return
            writeHomePlace({ country: query.country, city: query.city })
          }}
        >
          <span>Save as default</span>
          <span className="text-xs font-normal text-neutral-500">{currentLabel}</span>
        </button>
      ) : null}
      {home ? (
        <button
          type="button"
          role="menuitem"
          className="flex h-8 w-full cursor-pointer items-center rounded-md px-2 text-left text-sm hover:bg-neutral-100"
          onClick={() => writeHomePlace(null)}
        >
          Clear default
        </button>
      ) : null}
      {home || canSaveDefault ? <div className="mx-1 my-1 h-px bg-neutral-200" /> : null}
      {searching ? null : (
        <MenuLink href={locationHref(pathname, search, null)} onClick={() => markBrowsingEverywhere()}>
          <span className={cn("min-w-0 flex-1 truncate", !query.country && "font-medium")}>All Africa</span>
        </MenuLink>
      )}
      <div className="max-h-72 overflow-y-auto">
        {(searching ? matches : featured).map((country) => (
          <CountryChoice
            key={country.code}
            code={country.code}
            name={country.name}
            active={query.country === country.code}
            pathname={pathname}
            search={search}
          />
        ))}
        {!searching ? <div className="mx-1 my-1 h-px bg-neutral-200" /> : null}
        {searching
          ? null
          : rest.map((country) => (
              <CountryChoice
                key={country.code}
                code={country.code}
                name={country.name}
                active={query.country === country.code}
                pathname={pathname}
                search={search}
              />
            ))}
        {searching && cityHits.length > 0 ? (
          <>
            {matches.length > 0 ? <div className="mx-1 my-1 h-px bg-neutral-200" /> : null}
            {cityHits.map((city) => (
              <MenuLink
                key={`${city.country}-${city.id}`}
                href={locationHref(pathname, search, city.country, city.name)}
                onClick={() => clearBrowsingEverywhere()}
              >
                <span className="min-w-0 flex-1 truncate">{city.name}</span>
                <span className="text-[11px] text-neutral-400">{countryName(city.country)}</span>
              </MenuLink>
            ))}
          </>
        ) : null}
        {searching && matches.length === 0 && cityHits.length === 0 ? (
          <p className="px-2 py-3 text-xs text-neutral-500">No country or city matches.</p>
        ) : null}
      </div>
    </HeaderMenu>
  )
}

function CountryChoice({
  code,
  name,
  active,
  pathname,
  search,
}: {
  code: string
  name: string
  active: boolean
  pathname: string
  search: string
}) {
  return (
    <MenuLink
      href={locationHref(pathname, search, code)}
      onClick={() => clearBrowsingEverywhere()}
      className={cn(active && "font-medium")}
    >
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="text-[11px] text-neutral-400">{code}</span>
    </MenuLink>
  )
}

function HeaderMenu({
  label,
  summary,
  children,
  className,
  summaryClassName,
  panelClassName,
  panelRole = "menu",
  onOpen,
}: {
  label: string
  summary: ReactNode
  children: ReactNode
  className?: string
  summaryClassName?: string
  panelClassName?: string
  panelRole?: "menu" | "region"
  onOpen?: () => void
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false
  }, [pathname, searchKey])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const root = detailsRef.current
      if (!root?.open) return
      if (root.contains(event.target as Node)) return
      root.open = false
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current) detailsRef.current.open = false
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <details
      ref={detailsRef}
      name="site-header-menu"
      className={cn("group relative", className)}
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return
        const details = event.currentTarget
        if (!details.open) {
          stopWatchingHeaderPanel(details)
          return
        }
        onOpen?.()
        requestAnimationFrame(() => watchHeaderPanel(details))
      }}
    >
      <summary
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "outline" }),
          summaryClass,
          "group-open:bg-neutral-100 dark:group-open:bg-neutral-800",
          summaryClassName,
        )}
      >
        {summary}
      </summary>
      <div
        data-header-panel
        role={panelRole}
        aria-label={label}
        className={cn(
          "absolute top-full right-0 z-[80] mt-1.5 max-h-[min(24rem,calc(100dvh-5rem))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg bg-white p-1 text-sm shadow-md ring-1 ring-neutral-200",
          panelClassName,
        )}
      >
        {children}
      </div>
    </details>
  )
}

function MenuLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={cn(
        "flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-sm hover:bg-neutral-100",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}

function UnreadDot() {
  return <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
      <Input
        value={focused ? draft : value}
        onFocus={() => {
          setDraft(value)
          setFocused(true)
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setDraft(event.target.value)
          onChange(event.target.value)
        }}
        placeholder="Search for cars, houses, jobs, electronics and more..."
        aria-label="Search listings"
        className="h-11 rounded-full border-transparent bg-neutral-100 pr-4 pl-10 text-sm shadow-none focus-visible:border-neutral-300 focus-visible:bg-white focus-visible:ring-neutral-200"
      />
    </div>
  )
}

const panelWatchers = new WeakMap<HTMLDetailsElement, () => void>()

function watchHeaderPanel(details: HTMLDetailsElement) {
  stopWatchingHeaderPanel(details)
  const place = () => placeHeaderPanel(details)
  place()
  window.addEventListener("resize", place)
  const cleanup = () => window.removeEventListener("resize", place)
  panelWatchers.set(details, cleanup)
}

function stopWatchingHeaderPanel(details: HTMLDetailsElement) {
  panelWatchers.get(details)?.()
  panelWatchers.delete(details)
}

function placeHeaderPanel(details: HTMLDetailsElement) {
  const panel = details.querySelector<HTMLElement>("[data-header-panel]")
  const summary = details.querySelector("summary")
  if (!panel || !summary) return
  const trigger = summary.getBoundingClientRect()
  const width = panel.getBoundingClientRect().width || panel.offsetWidth
  const margin = 8
  let left = trigger.right - width
  if (left < margin) left = margin
  if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - width)
  const below = window.innerHeight - trigger.bottom
  const above = trigger.top
  const openAbove = below < 260 && above > below
  const top = openAbove ? Math.max(margin, trigger.top - Math.min(384, above - margin) - 6) : trigger.bottom + 6
  panel.style.position = "fixed"
  panel.style.top = `${top}px`
  panel.style.left = `${Math.round(left)}px`
  panel.style.right = "auto"
  panel.style.marginTop = "0"
  panel.style.zIndex = "80"
  panel.style.maxHeight = `${Math.max(120, Math.round(openAbove ? trigger.top - top - 6 : window.innerHeight - top - margin))}px`
}


function locationHref(pathname: string, search: string, country: string | null, city?: string | null): string {
  const pathCategory = categoryFromPath(pathname)
  const onBoard = pathname === "/" || pathCategory !== undefined
  const params = new URLSearchParams(onBoard ? search : "")
  if (country) {
    params.set("country", country)
    if (city) params.set("city", city)
    else params.delete("city")
  } else {
    params.delete("country")
    params.delete("city")
  }
  params.delete("category")
  const path = onBoard ? (pathCategory ? `/${pathCategory}` : "/") : "/"
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

function placeLabel(country: string, city?: string) {
  return city ? `${city}, ${countryName(country)}` : countryName(country)
}

function filterCountries(query: string) {
  const needle = fold(query)
  if (!needle) return countries
  return countries.filter(
    (country) =>
      fold(country.name).includes(needle) ||
      country.code.toLowerCase() === needle ||
      fold(country.capital).includes(needle),
  )
}

export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center gap-1 px-2 md:h-[72px] md:gap-3 md:px-5 xl:gap-6 xl:px-8">
        <Logo iconOnly className="xl:hidden" />
        <Logo className="hidden xl:flex" />
        <div className="min-w-0 flex-1 px-2 md:mx-auto md:max-w-[680px] md:px-0">
          <div className="h-11 rounded-full bg-neutral-100" />
        </div>
        <nav aria-label="Account" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-lg items-center justify-around rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg md:static md:ml-auto md:max-w-none md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none lg:gap-3">
          <PostLink className={cn(buttonVariants(), "h-10 rounded-full bg-neutral-950 px-3 text-white")} ariaLabel="Post ad">
            Post ad
          </PostLink>
          <Link href="/messages" className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "rounded-full")}>
            <MessageCircle />
            <span className="sr-only">Messages</span>
          </Link>
          <Link href="/account" className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "rounded-full")}>
            <UserRound />
            <span className="sr-only">Profile</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
