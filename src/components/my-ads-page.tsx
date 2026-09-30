"use client"

import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { ListingThumb } from "@/components/inbox/listing-thumb"
import { usePrefs } from "@/components/prefs-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHorizontalScrollFades } from "@/hooks/use-scroll-fades"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import { postAdHref } from "@/lib/active-place"
import { daysUntilExpiry, isListingExpiringSoon } from "@/lib/expiry"
import { formatPosted, formatPrice, hoursAgoOf } from "@/lib/format"
import {
  effectiveListingStatus,
  listingStatusLabel,
  type ListingStatus,
  type ListingStatusFilter,
} from "@/lib/listing-status"
import { useMarketplace } from "@/lib/marketplace"
import { useRememberedPlace } from "@/lib/use-remembered-place"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

type ResumeStatus = "active" | "paused"

const filters: ListingStatusFilter[] = ["all", "active", "paused", "sold", "expired"]
const swipeReveal = 144

export function MyAdsPage() {
  const auth = useAuth()
  const router = useRouter()
  const { t } = usePrefs()
  const { ready, listings, messages, removeListing, setListingSold, setListingPaused, renewListing } =
    useMarketplace()
  const mine = useMemo(() => listings.filter((listing) => listing.mine), [listings])
  const unreadByListing = useMemo(() => unreadByListingId(messages), [messages])
  const postHref = postAdHref(useRememberedPlace())
  const [filter, setFilter] = useState<ListingStatusFilter>("all")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const pending = mine.find((listing) => listing.id === pendingId)

  useEffect(() => {
    if (auth.ready && !auth.signedIn) router.replace(signInHref("/my-ads"))
  }, [auth.ready, auth.signedIn, router])

  const counts = useMemo(() => {
    const next: Record<ListingStatusFilter, number> = {
      all: mine.length,
      active: 0,
      paused: 0,
      sold: 0,
      expired: 0,
    }
    for (const listing of mine) {
      next[effectiveListingStatus(listing)] += 1
    }
    return next
  }, [mine])

  const visible = useMemo(() => {
    if (filter === "all") return mine
    return mine.filter((listing) => effectiveListingStatus(listing) === filter)
  }, [filter, mine])

  const withUndo = useCallback((message: string, undo: () => Promise<void>) => {
    toast.success(message, {
      action: {
        label: t("common.undo"),
        onClick: () => {
          void undo().catch(() => toast.error(t("myAds.toast.undoError")))
        },
      },
    })
  }, [t])

  async function onSold(listing: Listing, sold: boolean) {
    const prior = effectiveListingStatus(listing)
    const resumeTo: ResumeStatus = prior === "paused" ? "paused" : "active"
    setBusyId(listing.id)
    const result = await setListingSold(listing.id, sold)
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    if (sold) {
      withUndo(t("myAds.toast.sold"), async () => {
        const undo = await setListingSold(listing.id, false, resumeTo)
        if (!undo.ok) throw new Error(undo.reason)
        toast.success(resumeTo === "paused" ? t("myAds.toast.paused") : t("myAds.toast.available"))
      })
    } else {
      toast.success(t("myAds.toast.available"))
    }
  }

  async function onPause(listing: Listing, paused: boolean) {
    setBusyId(listing.id)
    const result = await setListingPaused(listing.id, paused)
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    if (paused) {
      withUndo(t("myAds.toast.paused"), async () => {
        const undo = await setListingPaused(listing.id, false)
        if (!undo.ok) throw new Error(undo.reason)
        toast.success(t("myAds.toast.resumed"))
      })
    } else {
      toast.success(t("myAds.toast.resumed"))
    }
  }

  async function onRenew(listing: Listing) {
    setBusyId(listing.id)
    const result = await renewListing(listing.id)
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(t("myAds.toast.renewed"))
  }

  async function onShare(listing: Listing) {
    const url = `${window.location.origin}/listings/${encodeURIComponent(listing.id)}`
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: listing.title, url })
        return
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t("myAds.toast.linkCopied"))
    } catch {
      toast.error(t("myAds.toast.shareError"))
    }
  }

  async function onRemove() {
    if (!pendingId) return
    setBusyId(pendingId)
    const result = await removeListing(pendingId)
    setBusyId(null)
    setPendingId(null)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(t("myAds.toast.removed"))
  }

  if (!auth.ready || !ready) {
    return (
      <div className="w-full px-3 py-6 md:px-4">
        <p className="text-sm text-neutral-500">{t("myAds.loading")}</p>
      </div>
    )
  }

  if (!auth.signedIn) {
    return (
      <div className="w-full px-3 py-8 md:px-4">
        <EmptyPanel
          title={t("myAds.signInTitle")}
          body={t("myAds.signInBody")}
          actionHref={signInHref("/my-ads")}
          actionLabel={t("nav.signIn")}
          headingLevel={1}
          className="mt-0"
        />
      </div>
    )
  }

  return (
    <div className="w-full px-3 py-3 md:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("myAds.title")}</h1>
        <div className="flex flex-wrap gap-2">
          {mine.some((listing) => listing.hidden) ? (
            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs">
              <Link href="/account/moderation">Moderation decisions</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" className="h-8 rounded-lg px-3 text-xs">
            <Link href={postHref}>{t("myAds.postAd")}</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {mine.length > 0 ? (
            <div className="space-y-3 border-b border-neutral-200 p-4">
              <StatusFilterChips filter={filter} counts={counts} onChange={setFilter} />
            </div>
          ) : null}

          {visible.length === 0 ? (
            mine.length === 0 ? (
              <EmptyPanel
                title={t("myAds.emptyNone")}
                actionHref={postHref}
                actionLabel={t("myAds.postAd")}
                className="m-4 mt-4"
              />
            ) : (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                {filter === "all"
                  ? t("myAds.emptyFilter")
                  : t("myAds.emptyStatus", { status: listingStatusLabel(filter).toLowerCase() })}
              </p>
            )
          ) : (
            <ul className="min-w-0 divide-y divide-neutral-100">
              {visible.map((listing) => (
                <MyAdRow
                  key={listing.id}
                  listing={listing}
                  unread={unreadByListing.get(listing.id) ?? 0}
                  busy={busyId === listing.id}
                  swipeOpen={openSwipeId === listing.id}
                  onSwipeOpen={(open) => setOpenSwipeId(open ? listing.id : null)}
                  onSold={(sold) => void onSold(listing, sold)}
                  onPause={(paused) => void onPause(listing, paused)}
                  onRenew={() => void onRenew(listing)}
                  onShare={() => void onShare(listing)}
                  onDelete={() => setPendingId(listing.id)}
                />
              ))}
            </ul>
          )}
        </div>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPendingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("myAds.removeTitle")}</DialogTitle>
            <DialogDescription>
              {pending ? t("myAds.removeBody", { title: pending.title }) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingId(null)}>
              {t("myAds.keepIt")}
            </Button>
            <Button variant="destructive" disabled={busyId === pendingId} onClick={() => void onRemove()}>
              {t("myAds.removeAd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusFilterChips({
  filter,
  counts,
  onChange,
}: {
  filter: ListingStatusFilter
  counts: Record<ListingStatusFilter, number>
  onChange: (next: ListingStatusFilter) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { left, right } = useHorizontalScrollFades(scrollerRef)

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollerRef}
        className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filter ads"
      >
        {filters.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => onChange(option)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              filter === option ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {option === "all" ? "All" : listingStatusLabel(option)}
            <span className="ml-1 tabular-nums opacity-70">{counts[option]}</span>
          </button>
        ))}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 motion-reduce:transition-none",
          left ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 motion-reduce:transition-none",
          right ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  )
}

function MyAdRow({
  listing,
  unread,
  busy,
  swipeOpen,
  onSwipeOpen,
  onSold,
  onPause,
  onRenew,
  onShare,
  onDelete,
}: {
  listing: Listing
  unread: number
  busy: boolean
  swipeOpen: boolean
  onSwipeOpen: (open: boolean) => void
  onSold: (sold: boolean) => void
  onPause: (paused: boolean) => void
  onRenew: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const status = effectiveListingStatus(listing)
  const sold = status === "sold"
  const paused = status === "paused"
  const expired = status === "expired"
  const expiringSoon = isListingExpiringSoon(listing.expiresAt)
  const daysLeft = daysUntilExpiry(listing.expiresAt)
  const canRenew = expired || expiringSoon
  const canPause = status === "active" || status === "paused"
  const reduceMotion = usePrefersReducedMotion()
  const { offset, handlers } = useSwipeOffset({
    open: swipeOpen,
    onOpenChange: onSwipeOpen,
    leftActions: true,
    rightActions: (canRenew && expired) || canPause,
    reduceMotion,
  })

  const meta = expiryMeta(listing, status, daysLeft, expiringSoon)

  return (
    <li className="relative overflow-hidden bg-white">
      <div className="absolute inset-y-0 right-0 flex md:hidden">
        <button
          type="button"
          disabled={busy || expired}
          onClick={() => onSold(!sold)}
          className="flex h-full min-h-11 min-w-11 items-center justify-center bg-emerald-600 px-4 text-xs font-medium text-white disabled:opacity-50"
          style={{ width: swipeReveal / 2 }}
        >
          {sold ? "Available" : "Sold"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="flex h-full min-h-11 min-w-11 items-center justify-center bg-rose-600 px-4 text-xs font-medium text-white disabled:opacity-50"
          style={{ width: swipeReveal / 2 }}
        >
          Delete
        </button>
      </div>
      <div className="absolute inset-y-0 left-0 flex md:hidden">
        {canRenew && expired ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRenew}
            className="flex h-full min-h-11 min-w-11 items-center justify-center bg-neutral-900 px-4 text-xs font-medium text-white disabled:opacity-50"
            style={{ width: swipeReveal }}
          >
            Renew
          </button>
        ) : canPause ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPause(!paused)}
            className="flex h-full min-h-11 min-w-11 items-center justify-center bg-amber-600 px-4 text-xs font-medium text-white disabled:opacity-50"
            style={{ width: swipeReveal }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "relative flex min-w-0 touch-pan-y items-stretch gap-3 bg-white px-4 py-4",
          !reduceMotion && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
      >
        <Link
          href={`/listings/${encodeURIComponent(listing.id)}`}
          className="flex min-w-0 flex-1 gap-3 rounded-sm outline-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-neutral-950"
        >
          <ListingThumb listing={listing} className="size-12" />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-start justify-between gap-2">
              <span className="truncate text-sm font-medium text-neutral-950">{listing.title}</span>
              <span className="shrink-0 text-[11px] text-neutral-500">Posted {formatPosted(hoursAgoOf(listing))}</span>
            </span>
            <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-neutral-600">
              <span className="font-medium text-neutral-950">{formatPrice(listing)}</span>
              <StatusBadge status={status} />
            </span>
            <span className="mt-1 block truncate text-xs text-neutral-500">{meta}</span>
          </span>
        </Link>
        {unread > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 shrink-0 self-center px-2 text-xs text-rose-600"
            asChild
          >
            <Link href={`/messages?listing=${encodeURIComponent(listing.id)}`}>
              {unread === 1 ? "1 unread" : `${unread} unread`}
            </Link>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 self-center text-neutral-600"
              aria-label={`Actions for ${listing.title}`}
              disabled={busy}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem asChild>
              <Link href={`/post?edit=${encodeURIComponent(listing.id)}`}>Edit</Link>
            </DropdownMenuItem>
            {unread > 0 ? (
              <DropdownMenuItem asChild>
                <Link href={`/messages?listing=${encodeURIComponent(listing.id)}`}>
                  {unread === 1 ? "1 unread message" : `${unread} unread messages`}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {!expired ? (
              <DropdownMenuItem disabled={busy} onSelect={() => onSold(!sold)}>
                {sold ? "Mark as available" : "Mark as sold"}
              </DropdownMenuItem>
            ) : null}
            {canPause ? (
              <DropdownMenuItem disabled={busy} onSelect={() => onPause(!paused)}>
                {paused ? "Resume" : "Pause"}
              </DropdownMenuItem>
            ) : null}
            {canRenew ? (
              <DropdownMenuItem disabled={busy} onSelect={onRenew}>
                Renew
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem disabled={busy} onSelect={onShare}>
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={onDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: ListingStatus }) {
  const styles: Record<ListingStatus, string> = {
    active: "border-transparent bg-emerald-50 text-emerald-800",
    paused: "border-transparent bg-amber-50 text-amber-900",
    sold: "border-transparent bg-neutral-100 text-neutral-700",
    expired: "border-transparent bg-rose-50 text-rose-800",
  }
  return (
    <Badge variant="outline" className={cn("h-5 rounded-md px-1.5 text-[10px] font-medium", styles[status])}>
      {listingStatusLabel(status)}
    </Badge>
  )
}

function expiryMeta(
  listing: Listing,
  status: ListingStatus,
  daysLeft: number | undefined,
  expiringSoon: boolean,
) {
  if (status === "expired") return "Expired — renew to put it back on the board"
  if (status === "sold") return "Hidden from browse · marked sold"
  if (status === "paused") return "Hidden from browse · paused"
  if (expiringSoon) {
    return daysLeft === 1 ? "Expires tomorrow" : `Expires in ${daysLeft ?? "a few"} days`
  }
  if (listing.hidden) return "Hidden by moderators"
  return daysLeft !== undefined ? `Expires in ${daysLeft} days` : "On the board"
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])
  return reduced
}

function unreadByListingId(
  messages: { listingId: string; read: boolean; fromMe: boolean; viewerIsSeller: boolean }[],
) {
  const counts = new Map<string, number>()
  for (const message of messages) {
    if (!message.viewerIsSeller || message.fromMe || message.read) continue
    counts.set(message.listingId, (counts.get(message.listingId) ?? 0) + 1)
  }
  return counts
}

function useSwipeOffset({
  open,
  onOpenChange,
  leftActions,
  rightActions,
  reduceMotion,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leftActions: boolean
  rightActions: boolean
  reduceMotion: boolean
}) {
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const [openSide, setOpenSide] = useState<"left" | "right">("left")
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const axis = useRef<"undecided" | "x" | "y">("undecided")
  const tracking = useRef(false)
  const captured = useRef(false)
  const targetRef = useRef<HTMLDivElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const dragRef = useRef<number | null>(null)

  const resting = !open ? 0 : openSide === "right" ? swipeReveal : -swipeReveal
  const offset = dragOffset ?? resting

  useEffect(() => {
    dragRef.current = dragOffset
  }, [dragOffset])

  const handlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (window.matchMedia("(min-width: 768px)").matches) return
      if (event.pointerType === "mouse" && event.buttons !== 1) return
      tracking.current = true
      captured.current = false
      axis.current = "undecided"
      startX.current = event.clientX
      startY.current = event.clientY
      startOffset.current = dragRef.current ?? resting
      targetRef.current = event.currentTarget
      pointerIdRef.current = event.pointerId
      // Do not setPointerCapture yet — a tap must still activate the listing link.
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!tracking.current) return
      const dx = event.clientX - startX.current
      const dy = event.clientY - startY.current
      if (axis.current === "undecided") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
        if (axis.current === "y") {
          tracking.current = false
          return
        }
        if (!captured.current && targetRef.current && pointerIdRef.current !== null) {
          targetRef.current.setPointerCapture(pointerIdRef.current)
          captured.current = true
        }
      }
      if (axis.current !== "x") return
      event.preventDefault()
      let next = startOffset.current + dx
      if (!leftActions && next < 0) next = 0
      if (!rightActions && next > 0) next = 0
      next = Math.max(-swipeReveal, Math.min(swipeReveal, next))
      if (reduceMotion) {
        next = next === 0 ? 0 : next < 0 ? -swipeReveal : swipeReveal
      }
      setDragOffset(next)
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      const wasHorizontal = tracking.current && axis.current === "x"
      if (captured.current && targetRef.current?.hasPointerCapture(event.pointerId)) {
        targetRef.current.releasePointerCapture(event.pointerId)
      }
      tracking.current = false
      captured.current = false
      pointerIdRef.current = null
      if (!wasHorizontal) return
      const current = dragRef.current ?? resting
      const snapLeft = current <= -swipeReveal / 2
      const snapRight = current >= swipeReveal / 2
      if (snapLeft && leftActions) {
        setOpenSide("left")
        setDragOffset(null)
        onOpenChange(true)
      } else if (snapRight && rightActions) {
        setOpenSide("right")
        setDragOffset(null)
        onOpenChange(true)
      } else {
        setDragOffset(null)
        onOpenChange(false)
      }
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (captured.current && targetRef.current?.hasPointerCapture(event.pointerId)) {
        targetRef.current.releasePointerCapture(event.pointerId)
      }
      tracking.current = false
      captured.current = false
      pointerIdRef.current = null
      setDragOffset(null)
    },
  }

  return { offset, handlers }
}
