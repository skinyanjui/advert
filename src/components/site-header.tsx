"use client"

import { ChevronDown, Inbox, MapPin, MessageCircle, RefreshCw, Search } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Logo } from "@/components/logo"
import { CategoryTopNav } from "@/components/category-top-nav"
import { PostLink, usePostAdHref } from "@/components/post-link"
import { ProfileMenu } from "@/components/profile-menu"
import { ThemeMenu } from "@/components/theme-choices"
import { usePrefs } from "@/components/prefs-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchCitiesAnywhere } from "@/lib/cities"
import { countries, countryName, fold, moreCountries, primaryCountries } from "@/lib/countries"
import { formatPlaceLabel } from "@/lib/format"
import { clearBrowsingEverywhere, markBrowsingEverywhere, useHomePlace, writeHomePlace } from "@/lib/home-place"
import { useMarketplace } from "@/lib/marketplace"
import { recentMessageNotifications, unreadMessageCount } from "@/lib/messages"
import { navItem } from "@/lib/nav"
import { categoryFromPath, useListingQuery, type ListingQuery } from "@/lib/use-listing-query"
import { cn } from "@/lib/utils"

const summaryClass =
  "menu-summary cursor-pointer list-none rounded-full [&::-webkit-details-marker]:hidden [&::marker]:content-none"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background">
      <TopNav />
    </header>
  )
}

function TopNav() {
  const { query, update } = useListingQuery()
  const { t } = usePrefs()
  const pathname = usePathname()
  const locationLabel = query.country ? countryName(query.country) : t("nav.allAfrica")

  return (
    <div className="grid h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 md:h-16 md:grid-cols-[15.5rem_minmax(0,1fr)_auto] md:gap-0 md:px-0">
      <TopNavBrand />
      <TopNavDiscovery search={query.q} onSearchChange={(value) => update({ q: value })} />
      <TopNavActions pathname={pathname} locationLabel={locationLabel} query={query} />
    </div>
  )
}

function TopNavBrand() {
  return (
    <div className="shrink-0 md:flex md:h-16 md:items-center md:px-4">
      <Logo iconOnly className="xl:hidden" />
      <Logo className="hidden xl:flex" />
    </div>
  )
}

function TopNavDiscovery({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 md:px-4">
      <TopNavSearch value={search} onChange={onSearchChange} />
      <TopNavCategories />
    </div>
  )
}

function TopNavSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0 flex-1">
      <SearchField value={value} onChange={onChange} />
    </div>
  )
}

function TopNavCategories() {
  return (
    <div className="shrink-0">
      <CategoryTopNav />
    </div>
  )
}

function TopNavActions({ pathname, locationLabel, query }: { pathname: string; locationLabel: string; query: ListingQuery }) {
  const { t } = usePrefs()
  return (
    <div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-md items-center rounded-2xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur md:static md:inset-auto md:ml-0 md:max-w-none md:shrink-0 md:rounded-none md:border-0 md:bg-transparent md:pr-4 md:pl-2 md:shadow-none md:backdrop-blur-none">
      <nav aria-label={t("nav.navigation")} className="flex w-full items-center justify-between gap-1 md:justify-end md:gap-1.5 lg:gap-2">
        <TopNavHome pathname={pathname} />
        <CountryMenu label={locationLabel} query={query} />
        <TopNavPost />
        <ProfileMenu notifications={<ProfileNotifications />} />
        <ThemeMenu />
      </nav>
    </div>
  )
}

function TopNavHome({ pathname }: { pathname: string }) {
  const { t } = usePrefs()
  const home = navItem("home")
  const Icon = home.icon
  return (
    <Button asChild variant="outline" size="icon" className="rounded-full md:hidden">
      <Link href={home.href} aria-label={t("nav.home")} aria-current={pathname === "/" ? "page" : undefined}>
        <Icon />
        <span className="sr-only">{t("nav.home")}</span>
      </Link>
    </Button>
  )
}

function TopNavPost() {
  const { t } = usePrefs()
  const post = navItem("post")
  const Icon = post.icon
  const href = usePostAdHref()
  return (
    <Button asChild className="h-8 rounded-full border border-primary bg-primary px-2 text-xs text-primary-foreground hover:bg-primary/80 sm:px-2.5 xl:px-3">
      <Link href={href} aria-label={t("nav.postShort")}>
        <Icon />
        <span className="hidden xl:inline">{t("nav.postShort")}</span>
      </Link>
    </Button>
  )
}

function ProfileNotifications() {
  const { messages, ready, refreshBoard } = useMarketplace()
  const { t } = usePrefs()
  const [view, setView] = useState<"all" | "unread">("all")
  const [refreshing, setRefreshing] = useState(false)
  const unread = unreadMessageCount(messages)
  const notifications = recentMessageNotifications(messages, 8)
  const visible = view === "unread" ? notifications.filter((item) => !item.read) : notifications

  async function onRefresh() {
    setRefreshing(true)
    try {
      await refreshBoard({ force: true })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div role="region" aria-label={unread > 0 ? t("nav.notificationsUnread", { count: unread }) : t("nav.notifications")}>
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-neutral-950">{t("nav.notifications")}</h2>
          <p className="text-xs text-neutral-500" aria-live="polite">
            {unread > 0
              ? t("nav.notificationsUnreadCount", {
                  count: unread,
                  messages: unread === 1 ? t("nav.messageOne") : t("nav.messageMany"),
                })
              : t("nav.notificationsRecent")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("nav.refreshNotifications")}
          title={t("nav.refreshNotifications")}
          disabled={!ready || refreshing}
          onClick={() => void onRefresh()}
          className="size-8 shrink-0 rounded-full"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden="true" />
        </Button>
      </div>
      <div className="flex gap-1 px-3 pb-2" aria-label={t("nav.filterNotifications")}>
        {(["all", "unread"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              view === option ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {option === "all" ? t("nav.filterAll") : `${t("nav.filterUnread")}${unread ? ` ${unread}` : ""}`}
          </button>
        ))}
      </div>
      <div className="max-h-[min(14rem,calc(100dvh-22rem))] min-h-28 overflow-y-auto px-2 pb-2">
        {!ready && notifications.length === 0 ? (
          <p role="status" className="px-3 py-8 text-center text-sm text-neutral-500">
            {t("nav.notificationsLoading")}
          </p>
        ) : null}
        {ready && visible.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center px-5 py-5 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
              <Inbox className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-2 text-sm font-medium text-neutral-950">
              {view === "unread" ? t("nav.notificationsEmptyUnread") : t("nav.notificationsEmptyAll")}
            </p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-neutral-500">
              {view === "unread" ? t("nav.notificationsEmptyUnreadHint") : t("nav.notificationsEmptyAllHint")}
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
                    "flex items-start gap-3 rounded-xl px-3 py-2.5 outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-950",
                    !item.read && "bg-neutral-50",
                  )}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-neutral-200">
                    <MessageCircle className="size-3.5 text-neutral-700" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="sr-only">{item.read ? t("nav.readPrefix") : t("nav.unreadPrefix")}</span>
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("min-w-0 truncate text-sm", item.read ? "text-neutral-700" : "font-semibold text-neutral-950")}>
                        {item.viewerIsSeller ? t("nav.newInquiry") : t("nav.sellerReply")}
                      </span>
                      {!item.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-neutral-950" aria-hidden="true" /> : null}
                    </span>
                    <span className="block truncate text-xs font-medium text-neutral-600">{item.listingTitle}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-neutral-500">{item.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="border-t border-neutral-200 p-2">
        <Button asChild variant="ghost" className="h-9 w-full rounded-full text-xs font-medium text-neutral-700">
          <Link href="/messages">{t("nav.openMessages")}</Link>
        </Button>
      </div>
    </div>
  )
}

function CountryMenu({ label, query }: { label: string; query: ListingQuery }) {
  const { t } = usePrefs()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const home = useHomePlace()
  const [locationQuery, setLocationQuery] = useState("")
  const search = searchParams.toString()
  const homeLabel = home ? formatPlaceLabel(home.country, home.city) : undefined
  const currentLabel = query.country ? formatPlaceLabel(query.country, query.city) : undefined
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
      label={t("nav.country", { label })}
      summaryClassName="h-8 border-transparent bg-transparent px-2 shadow-none hover:bg-muted sm:max-w-44 sm:px-2.5 lg:max-w-40"
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
          placeholder={t("nav.searchPlace")}
          aria-label={t("nav.searchPlaceLabel")}
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
          <span className="text-[11px] text-neutral-400">{t("nav.defaultPlace")}</span>
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
          <span>{t("nav.saveAsDefault")}</span>
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
          {t("nav.clearDefault")}
        </button>
      ) : null}
      {home || canSaveDefault ? <div className="mx-1 my-1 h-px bg-neutral-200" /> : null}
      {searching ? null : (
        <MenuLink href={locationHref(pathname, search, null)} onClick={() => markBrowsingEverywhere()}>
          <span className={cn("min-w-0 flex-1 truncate", !query.country && "font-medium")}>{t("nav.allAfrica")}</span>
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
          <p className="px-2 py-3 text-xs text-neutral-500">{t("nav.noPlaceMatches")}</p>
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
          "absolute top-full right-0 z-[80] mt-1.5 max-h-[min(24rem,calc(100dvh-5rem))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-border",
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
  "aria-label": ariaLabel,
}: {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
  "aria-label"?: string
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-label={ariaLabel}
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


function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = usePrefs()
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-neutral-400" />
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
        placeholder={t("nav.searchPlaceholder")}
        aria-label={t("nav.searchListings")}
        className="h-8 rounded-lg border-border/70 bg-muted/35 pr-3 pl-9 text-[13px] shadow-none focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/30"
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
  const home = navItem("home")
  const post = navItem("post")
  const profile = navItem("profile")
  const HomeIcon = home.icon
  const ProfileIcon = profile.icon
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="grid h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 md:h-16 md:grid-cols-[15.5rem_minmax(0,1fr)_auto] md:gap-0 md:px-0">
        <Logo iconOnly className="xl:hidden" />
        <Logo className="hidden xl:flex" />
        <div className="min-w-0 md:px-4">
          <div className="h-8 rounded-lg bg-muted/50" />
        </div>
        <nav aria-label={profile.label} className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-md items-center justify-around rounded-2xl border border-border bg-background p-1.5 shadow-lg md:static md:ml-auto md:max-w-none md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none lg:gap-3">
          <Link
            href={home.href}
            aria-label={home.label}
            className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "rounded-full md:hidden")}
          >
            <HomeIcon />
            <span className="sr-only">{home.label}</span>
          </Link>
          <PostLink className={cn(buttonVariants(), "h-10 rounded-full bg-neutral-950 px-3 text-white")} ariaLabel={post.shortLabel}>
            {post.shortLabel}
          </PostLink>
          <Link href={profile.href} className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "relative rounded-full")}>
            <ProfileIcon />
            <span className="sr-only">{profile.label}</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
