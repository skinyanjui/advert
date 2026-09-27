"use client"

import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Flag, Heart, MapPin, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { relatedListings } from "@/lib/board"
import { seedListings } from "@/lib/catalog"
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
import { messageError } from "@/lib/messages"
import { daysUntilExpiry, isListingExpired, isListingExpiringSoon } from "@/lib/expiry"
import { listingFacts, listingVoice } from "@/lib/posting"
import { listingImages } from "@/lib/photos"
import { reportReasons } from "@/lib/reports"
import { useClientTime } from "@/lib/use-client-time"
import { categoryName, type Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

const sampleIds = new Set(seedListings.map((item) => item.id))

export function ListingDetail({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { listings, ready, isSaved, toggleSaved, messages, sendMessage, setListingSold, renewListing, removeListing } =
    useMarketplace()
  const listing = listings.find((item) => item.id === id)
  const [phoneVisible, setPhoneVisible] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messageSending, setMessageSending] = useState(false)
  const messageSendingRef = useRef(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportNote, setReportNote] = useState("")
  const [reportBusy, setReportBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoListingId, setPhotoListingId] = useState(id)
  if (photoListingId !== id) {
    setPhotoListingId(id)
    setPhotoIndex(0)
  }
  const gallery = listingImages(listing ?? { image: "", images: undefined })
  const activePhoto = gallery[Math.min(photoIndex, Math.max(gallery.length - 1, 0))] ?? listing?.image

  useEffect(() => {
    if (listing) document.title = `${listing.title} · africa classifieds`
  }, [listing])

  if (!listing) {
    if (!ready) return <DetailSkeleton />
    return <MissingListing />
  }

  const ad = listing
  const isSample = sampleIds.has(ad.id)
  const saved = isSaved(ad.id)
  const listingMessages = messages.filter((item) => item.listingId === ad.id)
  const threadCount = new Set(listingMessages.map((item) => item.conversationId)).size
  const unreadHere = listingMessages.filter((item) => !item.read && !item.fromMe).length
  const myMessageCount = listingMessages.filter((item) => item.fromMe).length
  const voice = listingVoice(ad)
  const facts = listingFacts(ad)
  const related = relatedListings(listings, ad)
  const backSearch = keptSearch(searchParams, ad.subcategory)
  const backHref = backSearch ? `/${ad.category}?${backSearch}` : `/${ad.category}`
  const expired = isListingExpired(ad.expiresAt)
  const contactOpen = !isSample && !ad.sold && !ad.mine && !expired
  const expiringSoon = isListingExpiringSoon(ad.expiresAt)
  const daysLeft = daysUntilExpiry(ad.expiresAt)

  async function share() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy the link")
    }
  }

  async function submitMessage() {
    if (messageSendingRef.current || !contactOpen) return
    const validationError = messageError(message)
    if (validationError) {
      toast.error(validationError)
      return
    }
    messageSendingRef.current = true
    setMessageSending(true)
    try {
      const result = await sendMessage(ad.id, message.trim())
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      setMessageOpen(false)
      setMessage("")
      toast.success(`Message sent to ${ad.sellerName}`)
    } catch {
      toast.error("Could not send your message. Please try again.")
    } finally {
      messageSendingRef.current = false
      setMessageSending(false)
    }
  }

  async function onSold() {
    setBusy(true)
    const next = !ad.sold
    const result = await setListingSold(ad.id, next)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(next ? "Marked as sold" : "Marked as available")
  }

  async function onRenew() {
    setBusy(true)
    const result = await renewListing(ad.id)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success("Ad renewed")
  }

  async function onRemove() {
    setBusy(true)
    const result = await removeListing(ad.id)
    setBusy(false)
    setConfirmRemove(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success("Ad removed")
    router.push("/my-ads")
  }

  async function submitReport() {
    setReportBusy(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: ad.id,
          reason: reportReason,
          note: reportNote,
        }),
      })
      const payload = (await response.json()) as { reason?: string }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not send the report.")
        return
      }
      setReportOpen(false)
      setReportReason("")
      setReportNote("")
      toast.success("Report sent. Thanks for helping keep the board safe.")
    } catch {
      toast.error("Could not send the report.")
    } finally {
      setReportBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 pt-6 pb-24 md:px-6 md:py-8 lg:pb-8">
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
            <div className="relative">
              <Image
                src={activePhoto ?? listing.image}
                alt={`${listing.title}, photo ${Math.min(photoIndex, gallery.length - 1) + 1} of ${gallery.length}`}
                width={1600}
                height={1000}
                unoptimized={(activePhoto ?? listing.image).startsWith("data:")}
                className="aspect-[16/10] w-full object-cover"
              />
              {gallery.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 left-2 size-9 -translate-y-1/2 rounded-full bg-white/95"
                    aria-label="Previous photo"
                    onClick={() => setPhotoIndex((index) => (index - 1 + gallery.length) % gallery.length)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 right-2 size-9 -translate-y-1/2 rounded-full bg-white/95"
                    aria-label="Next photo"
                    onClick={() => setPhotoIndex((index) => (index + 1) % gallery.length)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <span className="absolute right-3 bottom-3 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                    {Math.min(photoIndex, gallery.length - 1) + 1} / {gallery.length}
                  </span>
                </>
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-neutral-200 bg-white p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {gallery.map((photo, index) => (
                  <button
                    key={`${index}-${photo.slice(0, 24)}`}
                    type="button"
                    aria-label={`Show photo ${index + 1}`}
                    aria-current={index === photoIndex}
                    className={cn(
                      "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border",
                      index === photoIndex ? "border-neutral-950" : "border-neutral-200",
                    )}
                    onClick={() => setPhotoIndex(index)}
                  >
                    <Image
                      src={photo}
                      alt=""
                      fill
                      sizes="80px"
                      unoptimized={photo.startsWith("data:")}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {isSample ? (
                  <p className="mb-1 text-xs font-semibold tracking-wide text-amber-800 uppercase">Sample ad · contact unavailable</p>
                ) : null}
                {listing.sold ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">Sold</p>
                ) : null}
                {listing.hidden && listing.mine ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-amber-700 uppercase">Hidden from the board</p>
                ) : null}
                {listing.mine && expired ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">Expired</p>
                ) : listing.mine && expiringSoon ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-amber-700 uppercase">
                    Expires in {daysLeft === 1 ? "1 day" : `${daysLeft} days`}
                  </p>
                ) : null}
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
        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-[145px]">
          {isSample ? (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Sample listing</p>
              <p className="mt-1 leading-5">This ad is an example. Its seller and contact details are fictional, so messaging and calls are unavailable.</p>
            </div>
          ) : (
          <>
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
              <>
                <Button className="h-10 rounded-full" asChild>
                  <Link href={`/post?edit=${listing.id}`}>Edit ad</Link>
                </Button>
                <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => void onSold()}>
                  {listing.sold ? "Mark available" : "Mark sold"}
                </Button>
                {!listing.sold || expired ? (
                  <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => void onRenew()}>
                    Renew ad
                  </Button>
                ) : null}
                <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => setConfirmRemove(true)}>
                  Remove ad
                </Button>
                {threadCount > 0 ? (
                  <Button variant="outline" className="h-10 rounded-full" asChild>
                    <Link href={`/messages?listing=${listing.id}`}>
                      {unreadHere > 0
                        ? `Inbox (${unreadHere} unread)`
                        : threadCount === 1
                          ? "Inbox (1 conversation)"
                          : `Inbox (${threadCount} conversations)`}
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : listing.sold || expired ? (
              <p className="rounded-xl bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
                {expired ? "This ad has expired. Contact options are closed." : "This ad is marked sold. Contact options are closed."}
              </p>
            ) : (
              <Button className="h-10 rounded-full" onClick={() => setMessageOpen(true)}>
                {voice.messageLabel}
              </Button>
            )}
            {!listing.mine && myMessageCount > 0 ? (
              <Button variant="outline" className="h-10 rounded-full" asChild>
                <Link href={`/messages?listing=${listing.id}`}>
                  {unreadHere > 0 ? `Your messages (${unreadHere} unread)` : "Your messages"}
                </Link>
              </Button>
            ) : null}
            {contactOpen ? (
              <Button variant="outline" className="h-10 rounded-full" asChild>
                <a href={whatsappHref(listing.phone, listing.title)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {contactOpen || listing.mine ? (
              <Button variant="outline" className="h-10 rounded-full" onClick={() => setPhoneVisible(true)}>
                {phoneVisible ? listing.phone : "Show phone number"}
              </Button>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-neutral-500">{voice.safety}</p>
          {!listing.mine && contactOpen ? (
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Prefer WhatsApp or a call using the number above. On-site messages go to the seller’s inbox on this board —
              they can reply here, and you will see it in Messages.
            </p>
          ) : null}
          {!listing.mine && listing.id.startsWith("ad-") ? (
            <Button
              variant="ghost"
              className="mt-3 h-9 w-full justify-start rounded-full px-2 text-neutral-500"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="size-4" />
              Report this ad
            </Button>
          ) : null}
          </>
          )}
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 border-t bg-white p-3 md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{formatPrice(listing)}</p>
            <p className="truncate text-xs text-neutral-500">{formatPlace(listing)}</p>
          </div>
          {listing.mine ? (
            <Button className="shrink-0 rounded-full" asChild>
              <Link href={`/post?edit=${listing.id}`}>Edit ad</Link>
            </Button>
          ) : !contactOpen ? (
            <Button className="shrink-0 rounded-full" disabled>
              {isSample ? "Sample ad" : expired ? "Expired" : "Sold"}
            </Button>
          ) : (
            <Button className="shrink-0 rounded-full" onClick={() => setMessageOpen(true)}>
              {voice.messageLabel}
            </Button>
          )}
        </div>
      </div>
      <Dialog open={messageOpen && contactOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {listing.sellerName}</DialogTitle>
          </DialogHeader>
          <Textarea
            aria-label="Your message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={voice.messagePlaceholder}
            rows={4}
            maxLength={1000}
            disabled={messageSending}
          />
          {message && messageError(message) ? (
            <p className="text-xs text-amber-700">{messageError(message)}</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={messageSending} onClick={() => setMessageOpen(false)}>
              Cancel
            </Button>
            <Button disabled={messageSending || !!messageError(message)} onClick={() => void submitMessage()}>
              {messageSending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this ad?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">“{listing.title}” will leave the board.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void onRemove()}>
              Remove ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this ad</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="report-reason" className="w-full">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reportReasons.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-note">Note (optional)</Label>
              <Textarea
                id="report-note"
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value)}
                placeholder="Anything that helps a reviewer"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button disabled={reportBusy || !reportReason} onClick={() => void submitReport()}>
              {reportBusy ? "Sending…" : "Send report"}
            </Button>
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
    <div className="mx-auto w-full max-w-[1720px] px-4 py-8 md:px-6">
      <div className="h-4 w-28 rounded bg-neutral-200" />
      <div className="mt-4 aspect-[16/10] rounded-2xl bg-neutral-200" />
      <div className="mt-5 h-7 w-48 rounded bg-neutral-200" />
      <div className="mt-2 h-5 w-72 rounded bg-neutral-100" />
    </div>
  )
}
