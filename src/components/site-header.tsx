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
import { countries, countryName, fold } from "@/lib/countries"
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
] as const

type NotificationId = (typeof notifications)[number]["id"]

export function SiteHeader() {
  const { query, update } = useListingQuery()
  const { savedIds, messages } = useMarketplace()
  const [read, setRead] = useState<string[]>([])
  const [locationQuery, setLocationQuery] = useState("")
  const [accountOpen, setAccountOpen] = useState(false)

  const unread = notifications.filter((item) => !read.includes(item.id)).length
  const unreadMessages = messages.filter((item) => item.role === "sample" && !item.read).length
  const locationLabel = query.country ? countryName(query.country) : "All Africa"
  const locationMatches = filterCountries(locationQuery)

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto max-w-[1720px] px-4 md:px-6">
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
                  className="h-10 rounded-full px-2.5 sm:max-w-48 sm:px-3"
                  aria-label={`Country: ${locationLabel}`}
                >
                  <MapPin className="size-4 shrink-0 text-neutral-500" />
                  <span className="hidden max-w-32 truncate sm:inline">{locationLabel}</span>
                  <ChevronDown className="hidden size-4 shrink-0 text-neutral-400 sm:block" />
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
                    <DropdownMenuItem
                      onSelect={() => update({ country: null })}
                      className={cn(!query.country && "font-medium")}
                    >
                      All Africa
                    </DropdownMenuItem>
                  )}
                  {locationMatches.map((country) => (
                    <DropdownMenuItem
                      key={country.code}
                      onSelect={() => update({ country: country.code })}
                      className={cn(query.country === country.code && "font-medium")}
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
                {notifications.map((item) => {
                  const seen = read.includes(item.id)
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      className="items-start gap-3 py-2"
                      onSelect={() => {
                        setRead((current) => (current.includes(item.id) ? current : [...current, item.id]))
                        openNotification(item.id, update)
                      }}
                    >
                      <span
                        className={cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          seen ? "bg-neutral-300" : "bg-neutral-900",
                        )}
                      />
                      <span className="min-w-0">
                        <span className={cn("block text-sm", seen ? "font-normal text-neutral-500" : "font-medium")}>
                          {item.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">{item.body}</span>
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{item.time}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-lg" className="relative rounded-full" aria-label="Account menu">
                  <UserRound />
                  {unreadMessages > 0 ? (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <span className="block">Amina K.</span>
                  <span className="block text-xs font-normal text-muted-foreground">Demo account on this browser</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/messages" onClick={() => setAccountOpen(false)}>
                    Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/saved" onClick={() => setAccountOpen(false)}>
                    Saved ads ({savedIds.length})
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-ads" onClick={() => setAccountOpen(false)}>
                    My ads
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/post" onClick={() => setAccountOpen(false)}>
                    Post an ad
                  </Link>
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
    </header>
  )
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

function openNotification(
  id: NotificationId,
  update: ReturnType<typeof useListingQuery>["update"],
) {
  switch (id) {
    case "land-cruiser":
      update({ q: "Land Cruiser", category: null, country: null, city: null })
      return
    case "jobs":
      update({ q: "", category: "jobs", country: null, city: null })
      return
    case "farm":
      update({ q: "farm", category: null, country: "TZ", city: null })
      return
    default: {
      const unreachable: never = id
      return unreachable
    }
  }
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
      <div className="mx-auto flex h-[72px] max-w-[1720px] items-center px-4 md:px-6">
        <Logo />
      </div>
    </header>
  )
}
