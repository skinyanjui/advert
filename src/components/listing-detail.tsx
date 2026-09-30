"use client"

import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Flag, Heart, MapPin, MessageSquareText, Phone, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ListingCard } from "@/components/listing-card"
import { usePrefs } from "@/components/prefs-provider"
import { ListingPrice } from "@/components/listing-price"
import { WhatsAppConsentAction } from "@/components/whatsapp-consent-action"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import { relatedListings } from "@/lib/board"
import { seedListings } from "@/lib/catalog"
import { resolvePlace } from "@/lib/cities"
import { getCountry } from "@/lib/countries"
import { trackListingContactEvent } from "@/lib/contact-events"
import { formatPlace, initials, smsHref, whatsappHref } from "@/lib/format"
import { listingContactCapabilities } from "@/lib/listing-contact"
import { listingGridClassNameLoose } from "@/lib/listing-grid"
import { osmLinks } from "@/lib/map"
import { useMarketplace } from "@/lib/marketplace"
import { messageError } from "@/lib/messages"
import { daysUntilExpiry, isListingExpired, isListingExpiringSoon } from "@/lib/expiry"
import { effectiveListingStatus } from "@/lib/listing-status"
import { listingFacts, listingVoice } from "@/lib/posting"
import { listingImages } from "@/lib/photos"
import {
  formatPostedDate,
  formatRelativePosted,
  hoursAgoOf,
  postedDateTime,
} from "@/lib/relative-time"
import { reportReasons } from "@/lib/reports"
import { useClientTime } from "@/lib/use-client-time"
import { categoryName, type Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

const sampleIds = new Set(seedListings.map((item) => item.id))

export function ListingDetail({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const auth = useAuth()
  const { t } = usePrefs()
  const { listings, ready, isSaved, toggleSaved, messages, sendMessage, setListingSold, setListingPaused, renewListing, removeListing } =
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
  const [reportLegalBasis, setReportLegalBasis] = useState("")
  const [reportJurisdiction, setReportJurisdiction] = useState("")
  const [reportGoodFaith, setReportGoodFaith] = useState(false)
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
    if (!listing) return
    if (!listing.mine) trackListingContactEvent(listing.id, "listing_view")
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
  const facts = [
    ...(voice.typeName ? [{ label: "Type", value: voice.typeName }] : []),
    ...listingFacts(ad),
  ]
  const related = relatedListings(listings, ad)
  const backSearch = keptSearch(searchParams, ad.subcategory)
  const backHref = backSearch ? `/${ad.category}?${backSearch}` : `/${ad.category}`
  const expired = isListingExpired(ad.expiresAt)
  const status = effectiveListingStatus(ad)
  const contact = listingContactCapabilities({
    status,
    mine: ad.mine === true,
    signedIn: auth.signedIn,
    sample: isSample,
    hasPhone: Boolean(ad.phone.trim()),
    whatsappEnabled: ad.contactWhatsApp !== false,
    phoneEnabled: ad.contactPhone !== false,
  })
  const contactOpen = contact.message
  const whatsappOpen = contact.whatsapp
  const textOpen = contact.text
  const phoneOpen = contact.call
  const expiringSoon = isListingExpiringSoon(ad.expiresAt)
  const daysLeft = daysUntilExpiry(ad.expiresAt)
  const postedHours = ad.postedAt ? hoursAgoOf(ad) : ad.hoursAgo
  const postedLabel = formatRelativePosted(postedHours)
  const postedFull = formatPostedDate(ad.postedAt)
  const postedIso = postedDateTime(ad)
  const expiryLabel =
    !expired && daysLeft !== undefined && daysLeft > 0
      ? daysLeft === 1
        ? t("listing.expiresInOneDay")
        : t("listing.expiresInDays", { count: daysLeft })
      : undefined

  async function share() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t("toast.linkCopied"))
    } catch {
      toast.error(t("toast.copyError"))
    }
  }

  function openMessageComposer() {
    if (auth.configured && !auth.signedIn) {
      toast.error(t("toast.signInToMessage"))
      router.push(signInHref(`/listings/${ad.id}`))
      return
    }
    trackListingContactEvent(ad.id, "message_start")
    setMessageOpen(true)
    window.requestAnimationFrame(() => {
      document.getElementById("listing-message-composer")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    })
  }

  async function submitMessage() {
    if (messageSendingRef.current || !contactOpen) return
    if (auth.configured && !auth.signedIn) {
      toast.error(t("toast.signInToMessage"))
      router.push(signInHref(`/listings/${ad.id}`))
      return
    }
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
      toast.success(t("toast.messageSentTo", { name: ad.sellerName }))
    } catch {
      toast.error(t("toast.messageError"))
    } finally {
      messageSendingRef.current = false
      setMessageSending(false)
    }
  }

  async function onSold() {
    setBusy(true)
    const next = status !== "sold"
    const result = await setListingSold(ad.id, next)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(next ? t("myAds.toast.sold") : t("myAds.toast.available"))
  }

  async function onPause() {
    setBusy(true)
    const next = status !== "paused"
    const result = await setListingPaused(ad.id, next)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(next ? t("myAds.toast.paused") : t("myAds.toast.resumed"))
  }

  async function onRenew() {
    setBusy(true)
    const result = await renewListing(ad.id)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(t("myAds.toast.renewed"))
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
    toast.success(t("myAds.toast.removed"))
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
          legalBasis: reportReason === "illegal_content" ? reportLegalBasis : null,
          jurisdiction: reportReason === "illegal_content" ? reportJurisdiction : null,
          goodFaith: reportReason === "illegal_content" ? reportGoodFaith : false,
        }),
      })
      const payload = (await response.json()) as { reason?: string; autoHidden?: boolean }
      if (!response.ok) {
        toast.error(payload.reason ?? t("report.toast.error"))
        return
      }
      setReportOpen(false)
      setReportReason("")
      setReportNote("")
      setReportLegalBasis("")
      setReportJurisdiction("")
      setReportGoodFaith(false)
      toast.success(payload.autoHidden ? t("report.toast.autoHidden") : t("report.toast.sent"))
    } catch {
      toast.error(t("report.toast.error"))
    } finally {
      setReportBusy(false)
    }
  }

  function revealAndCall() {
    trackListingContactEvent(ad.id, "phone_click")
    setPhoneVisible(true)
    const tel = telHref(ad.phone)
    if (!tel) {
      document.getElementById("listing-contact")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      return
    }
    window.location.href = tel
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
                    aria-label={t("listing.previousPhoto")}
                    onClick={() => setPhotoIndex((index) => (index - 1 + gallery.length) % gallery.length)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 right-2 size-9 -translate-y-1/2 rounded-full bg-white/95"
                    aria-label={t("listing.nextPhoto")}
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
              <div className="min-w-0">
                {isSample ? (
                  <span className="mb-2 inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    {t("listing.sampleAd")}
                  </span>
                ) : null}
                {listing.sponsored ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-sky-800 uppercase">{t("listing.sponsored")}</p>
                ) : null}
                {listing.sold || status === "sold" ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">{t("listing.sold")}</p>
                ) : null}
                {status === "paused" && listing.mine ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-amber-700 uppercase">{t("listing.paused")}</p>
                ) : null}
                {listing.hidden && listing.mine ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-amber-700 uppercase">{t("listing.hiddenFromBoard")}</p>
                ) : null}
                {listing.mine && (expired || status === "expired") ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">{t("listing.expired")}</p>
                ) : listing.mine && expiringSoon ? (
                  <p className="mb-1 text-xs font-medium tracking-wide text-amber-700 uppercase">
                    {expiryLabel ?? t("listing.expiringSoon")}
                  </p>
                ) : null}
                <p className="text-2xl font-semibold tracking-tight">
                  <ListingPrice listing={listing} />
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
                  {listing.title}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    if (auth.configured && !auth.signedIn) {
                      router.push(signInHref(`/listings/${listing.id}`))
                      return
                    }
                    toggleSaved(listing.id)
                  }}
                >
                  <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
                  {saved ? t("listing.saved") : t("listing.saveShort")}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={share}>
                  <Share2 />
                  {t("listing.share")}
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-4 shrink-0" />
                <span className="truncate">{formatPlace(listing)}</span>
              </span>
              <span className="text-neutral-300" aria-hidden="true">
                ·
              </span>
              <time
                dateTime={postedIso}
                title={postedFull}
                suppressHydrationWarning={Boolean(postedIso)}
                className="inline-flex items-center gap-1"
              >
                <Clock className="size-4 shrink-0" />
                {postedLabel}
                {postedFull ? <span className="text-neutral-400">({postedFull})</span> : null}
              </time>
              {expiryLabel && !(listing.mine && (expired || expiringSoon)) ? (
                <>
                  <span className="text-neutral-300" aria-hidden="true">
                    ·
                  </span>
                  <span>{expiryLabel}</span>
                </>
              ) : null}
            </div>
          </div>
          {facts.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium text-neutral-950">{voice.detailHeading}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                {facts.map((fact) => (
                  <Fact key={fact.label} label={fact.label} value={fact.value} />
                ))}
              </dl>
            </section>
          ) : null}
          <section className="mt-6">
            <h2 className="text-sm font-medium text-neutral-950">{voice.aboutHeading}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">{listing.description}</p>
          </section>
          <PlacePanel listing={listing} />
        </div>
        <aside
          id="listing-contact"
          className="h-fit rounded-2xl border border-neutral-200 bg-white p-4 lg:sticky lg:top-[145px]"
        >
          <>
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              {listing.sellerAvatar ? <AvatarImage src={listing.sellerAvatar} alt="" /> : null}
              <AvatarFallback className="bg-neutral-950 text-sm font-medium text-white">
                {initials(listing.sellerName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{listing.sellerName}</p>
              <p className="text-xs text-neutral-500">{t("listing.memberSince", { year: listing.sellerSince })}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {listing.mine ? (
              <>
                <Button className="h-10 rounded-full" asChild>
                  <Link href={`/post?edit=${listing.id}`}>{t("common.edit")}</Link>
                </Button>
                <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => void onSold()}>
                  {status === "sold" ? t("listing.markAvailable") : t("listing.markSold")}
                </Button>
                {status === "active" || status === "paused" ? (
                  <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => void onPause()}>
                    {status === "paused" ? t("listing.resumeAd") : t("listing.pauseAd")}
                  </Button>
                ) : null}
                {status !== "sold" || expired ? (
                  <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => void onRenew()}>
                    {t("listing.renewAd")}
                  </Button>
                ) : null}
                <Button variant="outline" className="h-10 rounded-full" disabled={busy} onClick={() => setConfirmRemove(true)}>
                  {t("listing.removeAd")}
                </Button>
                {threadCount > 0 ? (
                  <Button variant="outline" className="h-10 rounded-full" asChild>
                    <Link href={`/messages?listing=${listing.id}`}>
                      {unreadHere > 0
                        ? t("listing.yourMessagesUnread", { count: unreadHere })
                        : threadCount === 1
                          ? t("listing.messagesCount", { count: 1 })
                          : t("listing.messagesCountMany", { count: threadCount })}
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : status !== "active" ? (
              <p className="rounded-xl bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
                {status === "expired"
                  ? t("listing.contactClosedExpired")
                  : status === "paused"
                    ? t("listing.contactClosedUnavailable")
                    : t("listing.contactClosedSold")}
              </p>
            ) : (
              <>
                <Button className="h-10 rounded-full" onClick={openMessageComposer}>
                  {auth.configured && !auth.signedIn ? t("listing.signInToMessage") : t("listing.messageSeller")}
                </Button>
                {whatsappOpen || textOpen || phoneOpen ? (
                  <div className="grid grid-cols-3 gap-2">
                    {whatsappOpen ? (
                      <WhatsAppConsentAction
                        listingId={listing.id}
                        sellerName={listing.sellerName}
                        listingTitle={listing.title}
                        href={whatsappHref(listing.phone, listing.title)}
                        ariaLabel={t("listing.whatsapp")}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                      >
                        <WhatsAppIcon className="size-4" />
                        {t("listing.whatsapp")}
                      </WhatsAppConsentAction>
                    ) : <span />}
                    {textOpen ? (
                      <Button variant="outline" className="h-10 rounded-full" asChild>
                        <a href={smsHref(listing.phone, listing.title)} onClick={() => trackListingContactEvent(listing.id, "sms_click")}>
                          <MessageSquareText className="size-4" />
                          {t("listing.text")}
                        </a>
                      </Button>
                    ) : <span />}
                    {phoneOpen ? (
                      <Button variant="outline" className="h-10 rounded-full" onClick={revealAndCall}>
                        <Phone className="size-4" />
                        {phoneVisible ? listing.phone : t("listing.call")}
                      </Button>
                    ) : <span />}
                  </div>
                ) : null}
              </>
            )}
            {!listing.mine && myMessageCount > 0 ? (
              <Button variant="outline" className="h-10 rounded-full" asChild>
                <Link href={`/messages?listing=${listing.id}`}>
                  {unreadHere > 0 ? t("listing.yourMessagesUnread", { count: unreadHere }) : t("listing.yourMessages")}
                </Link>
              </Button>
            ) : null}
            {listing.mine ? (
              <Button variant="outline" className="h-10 rounded-full" onClick={() => setPhoneVisible(true)}>
                {phoneVisible ? listing.phone : t("listing.showPhone")}
              </Button>
            ) : null}
          </div>
          {!listing.mine && contactOpen && messageOpen ? (
            <div
              id="listing-message-composer"
              className="mt-4 grid gap-3 border-t border-neutral-100 pt-4"
            >
              <div>
                <p className="text-sm font-medium text-neutral-950">{t("listing.messageSellerName", { name: listing.sellerName })}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {t("listing.messageThreadHint")}
                </p>
              </div>
              <Textarea
                aria-label={t("listing.yourMessage")}
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={messageSending}
                  onClick={() => {
                    setMessageOpen(false)
                    setMessage("")
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  disabled={messageSending || !!messageError(message)}
                  onClick={() => void submitMessage()}
                >
                  {messageSending ? t("listing.sending") : t("listing.send")}
                </Button>
              </div>
            </div>
          ) : null}
          <SafetyNote
            safety={voice.safety}
            messagingHint={
              !listing.mine && contactOpen
                ? t("listing.contactHint")
                : undefined
            }
          />
          {!listing.mine && listing.id.startsWith("ad-") ? (
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <Button
                variant="ghost"
                className="h-9 w-full justify-start rounded-full px-2 text-neutral-500"
                onClick={() => {
                  if (auth.configured && !auth.signedIn) {
                    router.push(signInHref(`/listings/${listing.id}`))
                    return
                  }
                  setReportOpen(true)
                }}
              >
                <Flag className="size-4" />
                {t("report.title")}
              </Button>
            </div>
          ): null}
          </>
        </aside>
      </div>
      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-neutral-950">{t("listing.similar")}</h2>
          <div className={`mt-3 ${listingGridClassNameLoose}`}>
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} preserve={keptSearch(searchParams, item.subcategory)} />
            ))}
          </div>
        </section>
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 border-t bg-white p-3 md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-[1100px] items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              <ListingPrice listing={listing} />
            </p>
            <p className="truncate text-xs text-neutral-500">{formatPlace(listing)}</p>
          </div>
          {listing.mine ? (
            <Button className="shrink-0 rounded-full" asChild>
              <Link href={`/post?edit=${listing.id}`}>{t("common.edit")}</Link>
            </Button>
          ) : !contactOpen ? (
            <Button className="shrink-0 rounded-full" disabled>
              {contact.closedStatus === "expired"
                ? t("listing.expired")
                : contact.closedStatus === "paused"
                  ? t("listing.paused")
                  : t("listing.sold")}
            </Button>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button className="h-10 max-w-[9.5rem] shrink-0 truncate rounded-full px-3" onClick={openMessageComposer}>
                {auth.configured && !auth.signedIn ? t("nav.signIn") : t("listing.messageSeller")}
              </Button>
              {whatsappOpen ? (
                <WhatsAppConsentAction
                  listingId={listing.id}
                  sellerName={listing.sellerName}
                  listingTitle={listing.title}
                  href={whatsappHref(listing.phone, listing.title)}
                  ariaLabel={t("listing.whatsapp")}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                >
                  <WhatsAppIcon className="size-4 text-[#25D366]" />
                </WhatsAppConsentAction>
              ) : null}
              {textOpen ? (
                <Button type="button" variant="outline" size="icon" className="size-10 shrink-0 rounded-full" asChild>
                  <a
                    href={smsHref(listing.phone, listing.title)}
                    aria-label={t("listing.text")}
                    onClick={() => trackListingContactEvent(listing.id, "sms_click")}
                  >
                    <MessageSquareText className="size-4" />
                  </a>
                </Button>
              ) : null}
              {phoneOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 rounded-full"
                  aria-label={t("listing.callPhone", { phone: listing.phone })}
                  onClick={revealAndCall}
                >
                  <Phone className="size-4" />
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("myAds.removeTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">{t("myAds.removeBody", { title: listing.title })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              {t("myAds.keepIt")}
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void onRemove()}>
              {t("myAds.removeAd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("report.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-reason">{t("report.reasonLabel")}</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="report-reason" className="w-full">
                  <SelectValue placeholder={t("report.chooseReason")} />
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
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">
              {t("report.automationHint")}
            </p>
            {reportReason === "illegal_content" ? (
              <div className="grid gap-3 rounded-xl border border-neutral-200 p-3">
                <p className="text-xs leading-5 text-neutral-600">{t("report.illegalHint")}</p>
                <div className="grid gap-1.5">
                  <Label htmlFor="report-jurisdiction">{t("report.jurisdictionLabel")}</Label>
                  <Input
                    id="report-jurisdiction"
                    value={reportJurisdiction}
                    maxLength={120}
                    onChange={(event) => setReportJurisdiction(event.target.value)}
                    placeholder={t("report.jurisdictionPlaceholder")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="report-legal-basis">{t("report.legalBasisLabel")}</Label>
                  <Textarea
                    id="report-legal-basis"
                    value={reportLegalBasis}
                    maxLength={1500}
                    onChange={(event) => setReportLegalBasis(event.target.value)}
                    placeholder={t("report.legalBasisPlaceholder")}
                    rows={4}
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0"
                    checked={reportGoodFaith}
                    onChange={(event) => setReportGoodFaith(event.target.checked)}
                  />
                  <span>{t("report.goodFaith")}</span>
                </label>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="report-note">{t("report.noteLabel")}</Label>
              <Textarea
                id="report-note"
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value)}
                placeholder={t("report.notePlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={
                reportBusy ||
                !reportReason ||
                (reportReason === "illegal_content" &&
                  (reportLegalBasis.trim().length < 10 || !reportGoodFaith))
              }
              onClick={() => void submitReport()}
            >
              {reportBusy ? t("report.sending") : t("report.send")}
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

function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "")
  if (!digits.replace(/\D/g, "")) return null
  return `tel:${digits}`
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2C6.58 2 2.15 6.37 2.15 11.75c0 1.92.52 3.78 1.51 5.42L2 22l4.99-1.6a10.1 10.1 0 0 0 5.05 1.34h.01c5.46 0 9.89-4.37 9.89-9.75S17.5 2 12.04 2zm5.76 13.84c-.24.67-1.4 1.24-1.93 1.32-.49.07-1.12.1-1.81-.11-.42-.13-.95-.27-1.64-.53-2.89-1.09-4.77-3.64-4.92-3.81-.14-.17-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.2-.14.32-.28.5-.14.17-.3.38-.42.51-.14.14-.28.29-.12.56.17.28.74 1.22 1.59 1.98 1.1.97 2.02 1.27 2.3 1.41.29.14.45.12.62-.07.17-.2.71-.83.9-1.11.19-.29.38-.24.64-.14.27.1 1.7.8 1.99.95.29.14.49.22.56.34.07.12.07.7-.17 1.37z" />
    </svg>
  )
}

function PlacePanel({ listing }: { listing: Listing }) {
  const [mapOpen, setMapOpen] = useState(false)
  const country = getCountry(listing.country)
  const resolved = resolvePlace(listing.country, listing.city)
  const point =
    typeof listing.latitude === "number" && typeof listing.longitude === "number"
      ? { lat: listing.latitude, lng: listing.longitude, pinned: true }
      : { lat: resolved.lat, lng: resolved.lng, pinned: resolved.matched }
  const canMap = point.pinned
  const timeZone = listing.timezone ?? (canMap ? resolved.timezone : country?.timezone ?? resolved.timezone)
  const localTime = useClientTime(timeZone)
  const links = osmLinks(point.lat, point.lng)
  if (!localTime && !canMap) return null

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
        {localTime ? <p>{localTime}</p> : null}
        {canMap ? (
          <button
            type="button"
            className="text-neutral-700 underline-offset-2 hover:underline"
            aria-expanded={mapOpen}
            onClick={() => setMapOpen((open) => !open)}
          >
            {mapOpen ? "Hide map" : "Show map"}
          </button>
        ) : null}
      </div>
      {canMap && mapOpen ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
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

function SafetyNote({ safety, messagingHint }: { safety: string; messagingHint?: string }) {
  const [open, setOpen] = useState(false)
  const firstStop = safety.indexOf(". ")
  const lead = firstStop === -1 ? safety : safety.slice(0, firstStop + 1)
  const rest = firstStop === -1 ? "" : safety.slice(firstStop + 2).trim()
  const hasMore = Boolean(rest || messagingHint)

  return (
    <div className="mt-4 text-xs leading-5 text-neutral-500">
      <p>
        {lead}
        {hasMore && !open ? (
          <>
            {" "}
            <button
              type="button"
              className="font-medium text-neutral-700 underline-offset-2 hover:underline"
              onClick={() => setOpen(true)}
            >
              More
            </button>
          </>
        ) : null}
      </p>
      {open ? (
        <div className="mt-1 space-y-1">
          {rest ? <p>{rest}</p> : null}
          {messagingHint ? <p>{messagingHint}</p> : null}
          <button
            type="button"
            className="font-medium text-neutral-700 underline-offset-2 hover:underline"
            onClick={() => setOpen(false)}
          >
            Less
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-neutral-900">{value}</dd>
    </div>
  )
}

function MissingListing() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">This listing is no longer available</h1>
      <p className="mt-2 text-sm text-neutral-500">
        It may have been sold, paused, expired, or removed.
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
