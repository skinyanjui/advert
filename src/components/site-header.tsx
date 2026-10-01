"use client"

import { ChevronDown, Globe2, MapPin, Search } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Logo } from "@/components/logo"
import { CategoryTopNav } from "@/components/category-top-nav"
import { usePostAdHref } from "@/components/post-link"
import { ProfileMenu } from "@/components/profile-menu"
import { LanguageCurrencyMenu } from "@/components/language-currency-fields"
import { ThemeMenu } from "@/components/theme-choices"
import { usePrefs } from "@/components/prefs-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchCitiesAnywhere } from "@/lib/cities"
import { countries, countryName, fold, moreCountries, primaryCountries } from "@/lib/countries"
import { formatPlaceLabel } from "@/lib/format"
import { clearBrowsingEverywhere, markBrowsingEverywhere, useHomePlace, writeHomePlace } from "@/lib/home-place"
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
    <div className="grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 md:h-16 md:grid-cols-[15.5rem_minmax(0,1fr)_auto] md:gap-0 md:px-0 md:py-0">
      <TopNavBrand />
      <TopNavDiscovery search={query.q} onSearchChange={(value) => update({ q: value })} />
      <TopNavMobileUtilities />
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
      <TopNavSearch value={search} onSearchChange={onSearchChange} />
      <TopNavCategories />
    </div>
  )
}

function TopNavSearch({ value, onSearchChange }: { value: string; onSearchChange: (value: string) => void }) {
  return <SearchField value={value} onChange={onSearchChange} />
}

function TopNavCategories() {
  return (
    <div className="shrink-0">
      <CategoryTopNav />
    </div>
  )
}

function TopNavMobileUtilities() {
  return (
    <div className="flex shrink-0 items-center gap-0.5 md:hidden">
      <ProfileMenu />
    </div>
  )
}

function TopNavActions({ pathname, locationLabel, query }: { pathname: string; locationLabel: string; query: ListingQuery }) {
  const { t } = usePrefs()
  return (
    <div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-md items-center rounded-2xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur md:static md:inset-auto md:ml-0 md:max-w-none md:shrink-0 md:rounded-none md:border-0 md:bg-transparent md:pr-4 md:pl-2 md:shadow-none md:backdrop-blur-none">
      <nav aria-label={t("nav.navigation")} className="flex w-full items-center justify-around gap-1 md:justify-end md:gap-1.5 lg:gap-2">
        <TopNavHome pathname={pathname} />
        <CountryMenu label={locationLabel} query={query} />
        <TopNavPost />
        <div className="hidden md:block"><ProfileMenu /></div>
        <div className="hidden items-center gap-1 md:flex">
          <HeaderMenu
            label="Language and currency"
            panelRole="region"
            panelClassName="w-auto p-0"
            summaryClassName="size-8 justify-center border-transparent bg-transparent p-0 shadow-none hover:bg-muted"
            summary={<Globe2 className="size-4" aria-hidden="true" />}
          >
            <LanguageCurrencyMenu />
          </HeaderMenu>
          <ThemeMenu />
        </div>
      </nav>
    </div>
  )
}

function TopNavHome({ pathname }: { pathname: string }) {
  const { t } = usePrefs()
  const home = navItem("home")
  const Icon = home.icon
  return (
    <Button asChild variant="outline" size="icon" className="size-10 rounded-full md:hidden">
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
    <Button asChild className="h-10 rounded-full border border-primary bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/80 md:h-8 md:px-2 md:text-xs sm:px-2.5 xl:px-3">
      <Link href={href} aria-label={t("nav.postShort")}>
        <Icon />
        <span className="md:hidden xl:inline">{t("nav.postShort")}</span>
      </Link>
    </Button>
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
      summaryClassName="h-10 border-transparent bg-transparent px-3 shadow-none hover:bg-muted md:h-8 md:px-2 sm:max-w-44 sm:px-2.5 lg:max-w-40"
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
          className="h-10 md:h-8"
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

function MenuLink({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className={cn("flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800", className)}
    >
      {children}
    </Link>
  )
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = usePrefs()
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(value)
  }, [focused, value])

  return (
    <label className="relative block w-full">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
        className="h-9 rounded-lg border-border/70 bg-muted/35 pr-3 pl-9 text-sm shadow-none md:h-8"
      />
    </label>
  )
}

function filterCountries(query: string) {
  const needle = fold(query.trim())
  if (!needle) return countries
  return countries.filter((country) => fold(`${country.name} ${country.code}`).includes(needle))
}

function locationHref(pathname: string, search: string, country: string | null, city?: string | null): string {
  const params = new URLSearchParams(search)
  if (country) params.set("country", country)
  else params.delete("country")
  if (country && city) params.set("city", city)
  else params.delete("city")
  const category = categoryFromPath(pathname)
  const path = pathname === "/" || category ? pathname : category ? `/${category}` : "/"
  const next = params.toString()
  return next ? `${path}?${next}` : path
}

function watchHeaderPanel(details: HTMLDetailsElement) {
  const panel = details.querySelector<HTMLElement>("[data-header-panel]")
  if (!panel) return
  const resize = () => {
    panel.style.maxWidth = `${Math.max(240, window.innerWidth - 16)}px`
  }
  resize()
  window.addEventListener("resize", resize)
  ;(details as HTMLDetailsElement & { __headerResize?: () => void }).__headerResize = resize
}

function stopWatchingHeaderPanel(details: HTMLDetailsElement) {
  const resize = (details as HTMLDetailsElement & { __headerResize?: () => void }).__headerResize
  if (resize) window.removeEventListener("resize", resize)
  delete (details as HTMLDetailsElement & { __headerResize?: () => void }).__headerResize
}
