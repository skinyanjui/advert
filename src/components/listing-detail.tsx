"use client"

import { ArrowLeft, Clock, Heart, MapPin, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { resolvePlace } from "@/lib/cities"
import {
  currencyLabel,
  formatLocalTime,
  getCountry,
  languageLabel,
} from "@/lib/countries"
import {
  formatPlace,
  formatPosted,
  formatPrice,
  hoursAgoOf,
  initials,
  whatsappHref,
} from "@/lib/format"
import { useMarketplace } from "@/lib/marketplace"
import { categoryName, type Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ListingDetail({ id }: { id: string }) {
  const { listings, ready, isSaved, toggleSaved } = useMarketplace()
  const listing = listings.find((item) => item.id === id)
  const [phoneVisible, setPhoneVisible] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (listing) document.title = `${listing.title} · africa classifieds`
  }, [listing])

  if (!listing) {
    if (!ready) return <DetailSkeleton />
    return <MissingListing />
  }

  const saved = isSaved(listing.id)
  const related = listings
    .filter((item) => item.category === listing.category && item.id !== listing.id)
    .slice(0, 4)

  async function share() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy the link")
    }
  }

  function sendMessage() {
    const text = message.trim()
    if (text.length < 8) {
      toast.error("Write a short message first")
      return
    }
    setMessageOpen(false)
    setMessage("")
    toast.success(`Message sent to ${listing?.sellerName}`)
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pt-6 pb-24 md:px-6 md:py-8 lg:pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="size-4" />
        All listings
      </Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            <Image
              src={listing.image}
              alt=""
              width={1600}
              height={1000}
              unoptimized={listing.image.startsWith("data:")}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-tight">{formatPrice(listing)}</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
                  {listing.title}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => toggleSaved(listing.id)}>
                  <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
                  {saved ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={share}>
                  <Share2 />
                  Share
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {formatPlace(listing)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" />
                {formatPosted(hoursAgoOf(listing))}
              </span>
              <span>{categoryName(listing.category)}</span>
              {listing.meta ? <span>{listing.meta}</span> : null}
            </div>
          </div>
          <section className="mt-8">
            <h2 className="text-sm font-medium text-neutral-950">Description</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">{listing.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Fact label="Condition" value={listing.condition} />
              <Fact label="Category" value={categoryName(listing.category)} />
              <Fact label="Listed" value={formatPosted(hoursAgoOf(listing))} />
            </dl>
          </section>
          <PlacePanel listing={listing} />
          {related.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-sm font-medium text-neutral-950">Similar listings</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-[132px]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-neutral-950 text-sm font-medium text-white">
              {initials(listing.sellerName)}
            </span>
            <div>
              <p className="font-medium">{listing.sellerName}</p>
              <p className="text-xs text-neutral-500">On africa classifieds since {listing.sellerSince}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <Button className="h-10 rounded-full" onClick={() => setMessageOpen(true)}>
              Message seller
            </Button>
            <Button variant="outline" className="h-10 rounded-full" asChild>
              <a href={whatsappHref(listing.phone, listing.title)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-full"
              onClick={() => setPhoneVisible(true)}
            >
              {phoneVisible ? listing.phone : "Show phone number"}
            </Button>
          </div>
          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Meet in a public place and confirm the item before you pay. This is a sample marketplace, so messages stay in your browser.
          </p>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 lg:hidden">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{formatPrice(listing)}</p>
            <p className="text-xs text-neutral-500">{formatPlace(listing)}</p>
          </div>
          <Button className="rounded-full" onClick={() => setMessageOpen(true)}>
            Message
          </Button>
        </div>
      </div>
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {listing.sellerName}</DialogTitle>
            <DialogDescription>
              About {listing.title}. The seller sees this on the demo account only.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Is this still available? I can view it tomorrow."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendMessage}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlacePanel({ listing }: { listing: Listing }) {
  const country = getCountry(listing.country)
  const resolved = resolvePlace(listing.country, listing.city)
  const point =
    typeof listing.latitude === "number" && typeof listing.longitude === "number"
      ? { lat: listing.latitude, lng: listing.longitude, pinned: true }
      : { lat: resolved.lat, lng: resolved.lng, pinned: resolved.matched }
  const { lat, lng } = point
  const showMap = point.pinned
  const timeZone = listing.timezone ?? (showMap ? resolved.timezone : country?.timezone ?? resolved.timezone)
  const localTime = useClientTime(timeZone)
  const currency = listing.currency ?? "USD"
  const languages = country?.languages.map((language) => languageLabel(language.code, language.name)) ?? []
  const pad = 0.08
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  const external = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-neutral-950">Place</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Fact label="Local time" value={localTime ?? timeZone} />
        <Fact label="Time zone" value={timeZone} />
        <Fact label="Currency" value={`${currencyLabel(currency)} (${currency})`} />
        {languages.length > 0 ? <Fact label="Languages" value={languages.join(", ")} /> : null}
      </dl>
      {showMap ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <iframe title={`Map of ${listing.city}`} src={embed} className="h-56 w-full" loading="lazy" />
          <a
            href={external}
            target="_blank"
            rel="noreferrer"
            className="block border-t px-3 py-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            Open {listing.city} in OpenStreetMap
          </a>
        </div>
      ) : null}
    </section>
  )
}

function useClientTime(timeZone: string): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => formatLocalTime(timeZone),
    () => null,
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-neutral-900">{value}</dd>
    </div>
  )
}

function MissingListing() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">This listing is gone</h1>
      <p className="mt-2 text-sm text-neutral-500">
        It may have been removed, or it only existed in another browser.
      </p>
      <Button asChild className="mt-5 rounded-full">
        <Link href="/">Back to listings</Link>
      </Button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-6">
      <div className="h-4 w-28 rounded bg-neutral-200" />
      <div className="mt-4 aspect-[16/10] rounded-2xl bg-neutral-200" />
      <div className="mt-5 h-7 w-48 rounded bg-neutral-200" />
      <div className="mt-2 h-5 w-72 rounded bg-neutral-100" />
    </div>
  )
}
