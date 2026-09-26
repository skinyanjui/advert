"use client"

import { ArrowLeft, Clock, Heart, MapPin, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { relatedListings } from "@/lib/board"
import { resolvePlace } from "@/lib/cities"
import { getCountry } from "@/lib/countries"
import {
  formatPlace,
  formatPosted,
  formatPrice,
  hoursAgoOf,
  initials,
  whatsappHref,
} from "@/lib/format"
import { osmLinks } from "@/lib/map"
import { useMarketplace } from "@/lib/marketplace"
import { listingFacts, listingVoice } from "@/lib/posting"
import { useClientTime } from "@/lib/use-client-time"
import { categoryName, type Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ListingDetail({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const { listings, ready, isSaved, toggleSaved, messages, sendMessage } = useMarketplace()
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
  const sentCount = messages.filter((item) => item.listingId === listing.id && item.role === "you").length
  const voice = listingVoice(listing)
  const facts = listingFacts(listing)
  const related = relatedListings(listings, listing)
  const backSearch = keptSearch(searchParams, listing.subcategory)
  const backHref = backSearch ? `/${listing.category}?${backSearch}` : `/${listing.category}`

  async function share() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy the link")
    }
  }

  const submitMessage = () => {
    void (async () => {
      const result = await sendMessage(listing.id, message)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      setMessageOpen(false)
      setMessage("")
      toast.success(`Message saved for ${listing.sellerName}`)
    })()
  }

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 pt-6 pb-24 md:py-8 md:pr-6 md:pl-[calc(var(--sidebar-width)+1.5rem)] lg:pb-8">
      <div className="mx-auto w-full max-w-[1100px]">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="size-4" />
        {categoryName(listing.category)}
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
              <span>
                <Link href={backHref} className="hover:text-neutral-900">
                  {categoryName(listing.category)}
                </Link>
                {voice.typeName ? ` · ${voice.typeName}` : ""}
              </span>
            </div>
          </div>
          <section className="mt-8">
            <h2 className="text-sm font-medium text-neutral-950">{voice.detailHeading}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {facts.map((fact) => (
                <Fact key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </dl>
          </section>
          <section className="mt-8">
            <h2 className="text-sm font-medium text-neutral-950">{voice.aboutHeading}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">{listing.description}</p>
          </section>
          <PlacePanel listing={listing} />
          {related.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-sm font-medium text-neutral-950">Similar listings</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <ListingCard key={item.id} listing={item} preserve={keptSearch(searchParams, item.subcategory)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-[85px]">
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
            {listing.mine ? (
              <Button className="h-10 rounded-full" asChild>
                <Link href={`/post?edit=${listing.id}`}>Edit ad</Link>
              </Button>
            ) : (
              <Button className="h-10 rounded-full" onClick={() => setMessageOpen(true)}>
                {voice.messageLabel}
              </Button>
            )}
            {sentCount > 0 ? (
              <Button variant="outline" className="h-10 rounded-full" asChild>
                <Link href={`/messages?listing=${listing.id}`}>Your messages ({sentCount})</Link>
              </Button>
            ) : null}
            {listing.mine ? null : (
              <Button variant="outline" className="h-10 rounded-full" asChild>
                <a href={whatsappHref(listing.phone, listing.title)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </Button>
            )}
            <Button variant="outline" className="h-10 rounded-full" onClick={() => setPhoneVisible(true)}>
              {phoneVisible ? listing.phone : "Show phone number"}
            </Button>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white p-3 md:left-[max(0px,calc((100%-1720px)/2))] md:pl-(--sidebar-width) lg:hidden">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{formatPrice(listing)}</p>
            <p className="truncate text-xs text-neutral-500">{formatPlace(listing)}</p>
          </div>
          {listing.mine ? (
            <Button className="shrink-0 rounded-full" asChild>
              <Link href={`/post?edit=${listing.id}`}>Edit ad</Link>
            </Button>
          ) : (
            <Button className="shrink-0 rounded-full" onClick={() => setMessageOpen(true)}>
              {voice.messageLabel}
            </Button>
          )}
        </div>
      </div>
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {listing.sellerName}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={voice.messagePlaceholder}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitMessage}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

function keptSearch(
  searchParams: { toString: () => string; get: (key: string) => string | null },
  subcategory?: string,
) {
  const params = new URLSearchParams(searchParams.toString())
  params.delete("category")
  const type = params.get("type")
  if (type && type !== subcategory) params.delete("type")
  const qs = params.toString()
  return qs
}

function PlacePanel({ listing }: { listing: Listing }) {
  const country = getCountry(listing.country)
  const resolved = resolvePlace(listing.country, listing.city)
  const point =
    typeof listing.latitude === "number" && typeof listing.longitude === "number"
      ? { lat: listing.latitude, lng: listing.longitude, pinned: true }
      : { lat: resolved.lat, lng: resolved.lng, pinned: resolved.matched }
  const showMap = point.pinned
  const timeZone = listing.timezone ?? (showMap ? resolved.timezone : country?.timezone ?? resolved.timezone)
  const localTime = useClientTime(timeZone)
  const links = osmLinks(point.lat, point.lng)
  if (!localTime && !showMap) return null

  return (
    <section className="mt-8">
      {localTime ? <p className="text-sm text-neutral-500">{localTime}</p> : null}
      {showMap ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <iframe title={`Map of ${listing.city}`} src={links.embed} className="h-56 w-full" loading="lazy" />
          <a
            href={links.external}
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
    <div className="mx-auto max-w-lg px-4 py-24 text-center md:pl-[calc(var(--sidebar-width)+1.5rem)]">
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
    <div className="mx-auto w-full max-w-[1720px] px-4 py-8 md:pr-6 md:pl-[calc(var(--sidebar-width)+1.5rem)]">
      <div className="h-4 w-28 rounded bg-neutral-200" />
      <div className="mt-4 aspect-[16/10] rounded-2xl bg-neutral-200" />
      <div className="mt-5 h-7 w-48 rounded bg-neutral-200" />
      <div className="mt-2 h-5 w-72 rounded bg-neutral-100" />
    </div>
  )
}
