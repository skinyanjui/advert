"use client"

import { Bell, ChevronDown, MapPin, Plus, Search, UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMarketplace } from "@/lib/marketplace"
import { countries, countryName, fold } from "@/lib/countries"
import { useHomePlace, writeHomePlace } from "@/lib/home-place"
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
type HeaderMenuId = "country" | "notifications" | "account"

export function SiteHeader() {
  const pathname = usePathname()
  const { query, update } = useListingQuery()
  const { savedIds, messages } = useMarketplace()
  const home = useHomePlace()
  const [read, setRead] = useState<string[]>([])
  const [locationQuery, setLocationQuery] = useState("")
  const [menu, setMenu] = useState<HeaderMenuId | null>(null)
  const menuRoot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenu(null)
  }, [pathname])

  useEffect(() => {
    if (!menu) return
    function onPointerDown(event: PointerEvent) {
      if (!menuRoot.current?.contains(event.target as Node)) setMenu(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menu])

  function toggleMenu(id: HeaderMenuId) {
    setMenu((current) => (current === id ? null : id))
    setLocationQuery("")
  }

  const unread = notifications.filter((item) => !read.includes(item.id)).length
  const unreadMessages = messages.filter((item) => item.role === "sample" && !item.read).length
  const locationLabel = query.country ? countryName(query.country) : "All Africa"
  const locationMatches = filterCountries(locationQuery)
  const homeLabel = home ? placeLabel(home.country, home.city) : undefined
  const currentLabel = query.country ? placeLabel(query.country, query.city) : undefined
  const canSaveDefault = !!currentLabel && currentLabel !== homeLabel

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto flex max-w-[1720px] items-center">
          <Logo />
          <div className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 md:gap-3 md:px-6 md:py-3.5">
          <div className="hidden min-w-0 flex-1 md:block">
            <SearchField value={query.q} onChange={(value) => update({ q: value })} />
          </div>
          <div ref={menuRoot} className="relative ml-auto flex items-center gap-2">
            <div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-2.5 sm:max-w-48 sm:px-3"
                aria-label={`Country: ${locationLabel}`}
                aria-expanded={menu === "country"}
                aria-haspopup="menu"
                onClick={() => toggleMenu("country")}
              >
                <MapPin className="size-4 shrink-0 text-neutral-500" />
                <span className="hidden max-w-32 truncate sm:inline">{locationLabel}</span>
                <ChevronDown className="hidden size-4 shrink-0 text-neutral-400 sm:block" />
              </Button>
              {menu === "country" ? (
                <div role="menu" aria-label="Countries" className={panelClass("w-64")}>
                  <div className="p-1">
                    <Input
                      value={locationQuery}
                      onChange={(event) => setLocationQuery(event.target.value)}
                      placeholder="Country, capital, or code"
                      aria-label="Search countries"
                      className="h-8"
                    />
                  </div>
                  <div className="mx-1 my-1 h-px bg-neutral-200" />
                  {home ? (
                    <MenuButton
                      onClick={() => {
                        update({ country: home.country, city: home.city ?? null })
                        setMenu(null)
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{homeLabel}</span>
                      <span className="text-[11px] text-neutral-400">Default</span>
                    </MenuButton>
                  ) : null}
                  {canSaveDefault ? (
                    <MenuButton
                      className="h-auto flex-col items-start gap-0.5 py-1.5"
                      onClick={() => {
                        if (!query.country) return
                        writeHomePlace({ country: query.country, city: query.city })
                        setMenu(null)
                      }}
                    >
                      <span>Save as default</span>
                      <span className="text-xs font-normal text-neutral-500">{currentLabel}</span>
                    </MenuButton>
                  ) : null}
                  {home ? (
                    <MenuButton
                      onClick={() => {
                        writeHomePlace(null)
                        setMenu(null)
                      }}
                    >
                      Clear default
                    </MenuButton>
                  ) : null}
                  {home || canSaveDefault ? <div className="mx-1 my-1 h-px bg-neutral-200" /> : null}
                  <div className="max-h-72 overflow-y-auto">
                    {locationQuery.trim() ? null : (
                      <MenuButton
                        className={cn(!query.country && "font-medium")}
                        onClick={() => {
                          update({ country: null })
                          setMenu(null)
                        }}
                      >
                        All Africa
                      </MenuButton>
                    )}
                    {locationMatches.map((country) => (
                      <MenuButton
                        key={country.code}
                        className={cn(query.country === country.code && "font-medium")}
                        onClick={() => {
                          update({ country: country.code })
                          setMenu(null)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{country.name}</span>
                        <span className="text-[11px] text-neutral-400">{country.code}</span>
                      </MenuButton>
                    ))}
                    {locationMatches.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-neutral-500">No country matches.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <Button asChild className="h-10 rounded-full bg-neutral-950 px-3 text-white hover:bg-neutral-800 sm:px-4">
              <Link href="/post" aria-label="Post ad" onClick={() => setMenu(null)}>
                <Plus />
                <span className="hidden sm:inline">Post ad</span>
              </Link>
            </Button>
            <div>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="relative rounded-full"
                aria-label="Notifications"
                aria-expanded={menu === "notifications"}
                aria-haspopup="menu"
                onClick={() => toggleMenu("notifications")}
              >
                <Bell />
                {unread > 0 ? (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
                ) : null}
              </Button>
              {menu === "notifications" ? (
                <div role="menu" aria-label="Notifications" className={panelClass("w-80")}>
                  <p className="px-2 py-1.5 text-sm font-medium">Notifications</p>
                  <div className="mx-1 mb-1 h-px bg-neutral-200" />
                  {notifications.map((item) => {
                    const seen = read.includes(item.id)
                    return (
                      <MenuButton
                        key={item.id}
                        className="h-auto items-start gap-3 py-2"
                        onClick={() => {
                          setRead((current) => (current.includes(item.id) ? current : [...current, item.id]))
                          openNotification(item.id, update)
                          setMenu(null)
                        }}
                      >
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            seen ? "bg-neutral-300" : "bg-neutral-900",
                          )}
                        />
                        <span className="min-w-0 flex-1 text-left">
                          <span className={cn("block text-sm", seen ? "font-normal text-neutral-500" : "font-medium")}>
                            {item.title}
                          </span>
                          <span className="block text-xs text-neutral-500">{item.body}</span>
                        </span>
                        <span className="text-[11px] text-neutral-500">{item.time}</span>
                      </MenuButton>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="relative rounded-full"
                aria-label="Account menu"
                aria-expanded={menu === "account"}
                aria-haspopup="menu"
                onClick={() => toggleMenu("account")}
              >
                <UserRound />
                {unreadMessages > 0 ? (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
                ) : null}
              </Button>
              {menu === "account" ? (
                <div role="menu" aria-label="Account" className={panelClass("w-52")}>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">Amina K.</p>
                    <p className="text-xs text-neutral-500">Demo account on this browser</p>
                  </div>
                  <div className="mx-1 my-1 h-px bg-neutral-200" />
                  <MenuLink href="/messages" onNavigate={() => setMenu(null)}>
                    Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}
                  </MenuLink>
                  <MenuLink href="/saved" onNavigate={() => setMenu(null)}>
                    Saved ads ({savedIds.length})
                  </MenuLink>
                  <MenuLink href="/my-ads" onNavigate={() => setMenu(null)}>
                    My ads
                  </MenuLink>
                  <MenuLink href="/post" onNavigate={() => setMenu(null)}>
                    Post an ad
                  </MenuLink>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SearchField value={query.q} onChange={(value) => update({ q: value })} />
        </div>
      </div>
    </header>
  )
}

function panelClass(width: string) {
  return cn(
    "absolute top-full right-0 z-50 mt-1.5 max-w-[calc(100vw-1.5rem)] rounded-lg bg-white p-1 text-sm shadow-md ring-1 ring-neutral-200",
    width,
  )
}

function MenuButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-sm hover:bg-neutral-100",
        className,
      )}
      {...props}
    />
  )
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex h-8 items-center rounded-md px-2 text-sm hover:bg-neutral-100"
      onClick={onNavigate}
    >
      {children}
    </Link>
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
      <div className="mx-auto flex h-[72px] max-w-[1720px] items-center">
        <Logo />
      </div>
    </header>
  )
}
