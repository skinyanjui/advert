"use client"

import { Bell, ChevronDown, MapPin, MessageCircle, Plus, Search, UserRound } from "lucide-react"
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
import { unreadMessageCount } from "@/lib/messages"
import { categoryFromPath, useListingQuery, type ListingQuery } from "@/lib/use-listing-query"
import { cn } from "@/lib/utils"

const notifications = [
  {
    id: "land-cruiser",
    title: "Similar vehicle listed",
    body: "A Land Cruiser was just posted in Nairobi.",
    time: "2h",
  },
  {
    id: "jobs",
    title: "Jobs near you",
    body: "New full-time roles in Nairobi this morning.",
    time: "4h",
  },
  {
    id: "farm",
    title: "Saved search",
    body: "Fresh farmland listings around Arusha.",
    time: "1d",
  },
] as const

type NotificationId = (typeof notifications)[number]["id"]

const summaryClass =
  "menu-summary cursor-pointer list-none rounded-full [&::-webkit-details-marker]:hidden [&::marker]:content-none"

export function SiteHeader() {
  const pathname = usePathname()
  const { query, update } = useListingQuery()
  const { savedIds, messages } = useMarketplace()
  const auth = useAuth()
  const [read, setRead] = useState<string[]>([])
  const unread = notifications.filter((item) => !read.includes(item.id)).length
  const unreadMessages = unreadMessageCount(messages)
  const sellerUnread = unreadMessageCount(messages.filter((item) => item.viewerIsSeller))
  const locationLabel = query.country ? countryName(query.country) : "All Africa"
  const remembered = useRememberedPlace()
  const postHref = postAdHref(query.country ? { country: query.country, city: query.city } : remembered)
  const profileLabel = auth.signedIn ? auth.email ?? "Signed in" : "Guest on this browser"
  const profileDetail = auth.signedIn ? "Ads stay with your account" : "Sign in to keep ads across devices"
  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center gap-1 px-2 md:relative md:h-[72px] md:gap-2 md:px-3">
          <Logo iconOnly />
          <div className="relative flex min-w-0 flex-1 items-center gap-1 px-1 lg:absolute lg:left-1/2 lg:w-[calc(100%-40rem)] lg:max-w-xl lg:-translate-x-1/2 lg:px-3">
            <div className="min-w-0 flex-1">
              <SearchField value={query.q} onChange={(value) => update({ q: value })} />
            </div>
            <div className="shrink-0 lg:absolute lg:top-1/2 lg:left-full lg:ml-1 lg:-translate-y-1/2">
              <CategoryTopNav />
            </div>
          </div>
          <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-lg items-center justify-between rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-lg md:static md:inset-auto md:ml-auto md:max-w-none md:shrink-0 md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:px-4 md:shadow-none">
            <nav aria-label="Navigation" className="flex w-full items-center justify-between gap-1 md:justify-end md:gap-2">
              <CountryMenu label={locationLabel} query={query} />
              <Button asChild className="h-10 rounded-full bg-neutral-950 px-3 text-white hover:bg-neutral-800 md:px-4">
                <Link href={postHref} aria-label="Post ad">
                  <Plus />
                  <span className="hidden 2xl:inline">Post ad</span>
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
              <HeaderMenu
                label="Notifications"
                summaryClassName="relative size-9 px-0"
                panelClassName="w-80"
                summary={
                  <>
                    <Bell />
                    {unread > 0 ? <UnreadDot /> : null}
                  </>
                }
              >
                <p className="px-2 py-1.5 text-sm font-medium">Notifications</p>
                <div className="mx-1 mb-1 h-px bg-neutral-200" />
                {notifications.map((item) => {
                  const seen = read.includes(item.id)
                  return (
                    <Link
                      key={item.id}
                      href={notificationHref(item.id)}
                      role="menuitem"
                      className="flex h-auto items-start gap-3 rounded-md px-2 py-2 hover:bg-neutral-100"
                      onClick={() => setRead((current) => (current.includes(item.id) ? current : [...current, item.id]))}
                    >
                      <span
                        className={cn("mt-1 size-2 shrink-0 rounded-full", seen ? "bg-neutral-300" : "bg-neutral-900")}
                      />
                      <span className="min-w-0 flex-1 text-left">
                        <span className={cn("block text-sm", seen ? "font-normal text-neutral-500" : "font-medium")}>
                          {item.title}
                        </span>
                        <span className="block text-xs text-neutral-500">{item.body}</span>
                      </span>
                      <span className="text-[11px] text-neutral-500">{item.time}</span>
                    </Link>
                  )
                })}
              </HeaderMenu>
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
      summaryClassName="h-10 px-2.5 sm:max-w-48 sm:px-3"
      panelClassName="w-64"
      onOpen={() => setLocationQuery("")}
      summary={
        <>
          <MapPin className="size-4 shrink-0 text-neutral-500" />
          <span className="hidden max-w-32 truncate sm:inline md:hidden 2xl:inline">{label}</span>
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
  onOpen,
}: {
  label: string
  summary: ReactNode
  children: ReactNode
  className?: string
  summaryClassName?: string
  panelClassName?: string
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
        role="menu"
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

function notificationHref(id: NotificationId): string {
  switch (id) {
    case "land-cruiser":
      return "/?q=Land%20Cruiser"
    case "jobs":
      return "/jobs"
    case "farm":
      return "/?q=farm&country=TZ"
    default: {
      const unreachable: never = id
      return unreachable
    }
  }
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
      <div className="mx-auto flex h-16 max-w-[1720px] items-center gap-1 px-2 md:h-[72px] md:px-3">
        <Logo iconOnly />
        <div className="min-w-0 flex-1 px-2 md:mx-auto md:max-w-xl">
          <div className="h-11 rounded-full bg-neutral-100" />
        </div>
        <nav aria-label="Account" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-lg items-center justify-around rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg md:static md:ml-auto md:max-w-none md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:px-4 md:shadow-none">
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
