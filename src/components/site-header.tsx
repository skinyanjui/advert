"use client"

import { Bell, ChevronDown, MapPin, Plus, Search, UserRound } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useMarketplace } from "@/lib/marketplace"
import { countries, countryName, fold, moreCountries, primaryCountries } from "@/lib/countries"
import { useListingQuery } from "@/lib/use-listing-query"
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
]

export function SiteHeader() {
  const { query, update } = useListingQuery()
  const { savedIds } = useMarketplace()
  const [read, setRead] = useState<string[]>([])
  const [locationQuery, setLocationQuery] = useState("")

  const unread = notifications.filter((item) => !read.includes(item.id)).length
  const locationLabel = query.country ? countryName(query.country) : "All Africa"
  const locationMatches = filterCountries(locationQuery)

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="flex items-center gap-2 py-3 md:gap-3 md:py-3.5">
          <Logo />
          <div className="hidden min-w-0 flex-1 md:block">
            <SearchField value={query.q} onChange={(value) => update({ q: value })} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) setLocationQuery("")
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden h-10 rounded-full px-3 lg:inline-flex"
                >
                  <MapPin className="size-4 text-neutral-500" />
                  <span className="max-w-32 truncate">{locationLabel}</span>
                  <ChevronDown className="size-4 text-neutral-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
                  <Input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Country, capital, or code"
                    aria-label="Search countries"
                    className="h-8"
                  />
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-72 overflow-y-auto">
                  {locationQuery.trim() ? null : (
                    <DropdownMenuItem onSelect={() => update({ country: null })}>
                      All Africa
                    </DropdownMenuItem>
                  )}
                  {locationMatches.map((country) => (
                    <DropdownMenuItem
                      key={country.code}
                      onSelect={() => update({ country: country.code })}
                    >
                      <span className="min-w-0 flex-1 truncate">{country.name}</span>
                      <span className="text-[11px] text-neutral-400">{country.code}</span>
                    </DropdownMenuItem>
                  ))}
                  {locationMatches.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-neutral-500">No country matches.</p>
                  ) : null}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild className="h-10 rounded-full bg-neutral-950 px-3 text-white hover:bg-neutral-800 sm:px-4">
              <Link href="/post">
                <Plus />
                <span className="hidden sm:inline">Post ad</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-lg" className="relative rounded-full" aria-label="Notifications">
                  <Bell />
                  {unread > 0 ? (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="items-start gap-3 py-2"
                    onSelect={() => setRead((current) => (current.includes(item.id) ? current : [...current, item.id]))}
                  >
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-neutral-900" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">{item.body}</span>
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{item.time}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-lg" className="rounded-full" aria-label="Account menu">
                  <UserRound />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <span className="block">Amina K.</span>
                  <span className="block text-xs font-normal text-muted-foreground">Demo account on this browser</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/saved">Saved ads ({savedIds.length})</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-ads">My ads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/post">Post an ad</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="pb-3 md:hidden">
          <SearchField value={query.q} onChange={(value) => update({ q: value })} />
        </div>
        </div>
      </div>
      <div className="bg-background">
        <div className="mx-auto max-w-[1280px] px-4 pt-2.5 md:px-6">
          <CountryTabs active={query.country} onSelect={(country) => update({ country: country ?? null })} />
        </div>
      </div>
    </header>
  )
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search for cars, houses, jobs, electronics and more..."
        aria-label="Search listings"
        className="h-11 rounded-full border-transparent bg-neutral-100 pr-4 pl-10 text-sm shadow-none focus-visible:border-neutral-300 focus-visible:bg-white focus-visible:ring-neutral-200"
      />
    </div>
  )
}

function CountryTabs({
  active,
  onSelect,
}: {
  active?: string
  onSelect: (country?: string) => void
}) {
  const primary = primaryCountries()
  const more = moreCountries()
  const moreActive = more.find((country) => country.code === active)
  const [moreQuery, setMoreQuery] = useState("")
  const moreMatches = filterCountries(moreQuery).filter((country) =>
    more.some((item) => item.code === country.code),
  )
  const primaryHit = filterCountries(moreQuery).find((country) =>
    primary.some((item) => item.code === country.code),
  )

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <CountryPill active={!active} onClick={() => onSelect(undefined)}>
        All
      </CountryPill>
      {primary.map((country) => (
        <CountryPill
          key={country.code}
          active={active === country.code}
          onClick={() => onSelect(country.code)}
        >
          {country.name}
        </CountryPill>
      ))}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) setMoreQuery("")
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-sm whitespace-nowrap",
              moreActive
                ? "bg-white font-medium text-neutral-950 shadow-sm ring-1 ring-black/5"
                : "text-neutral-500 hover:text-neutral-900",
            )}
          >
            {moreActive ? moreActive.name : "More"}
            <ChevronDown className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
            <Input
              value={moreQuery}
              onChange={(event) => setMoreQuery(event.target.value)}
              placeholder="Search countries"
              aria-label="Search more countries"
              className="h-8"
            />
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-72 overflow-y-auto">
            {moreMatches.map((country) => (
              <DropdownMenuItem key={country.code} onSelect={() => onSelect(country.code)}>
                {country.name}
              </DropdownMenuItem>
            ))}
            {moreMatches.length === 0 ? (
              <p className="px-2 py-3 text-xs text-neutral-500">
                {primaryHit ? `${primaryHit.name} is in the row above.` : "No country matches."}
              </p>
            ) : null}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
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

function CountryPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-colors",
        active
          ? "bg-white font-medium text-neutral-950 shadow-sm ring-1 ring-black/5"
          : "text-neutral-500 hover:bg-white/70 hover:text-neutral-900",
      )}
    >
      {children}
    </button>
  )
}

export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center px-4 md:px-6">
        <Logo />
      </div>
    </header>
  )
}
