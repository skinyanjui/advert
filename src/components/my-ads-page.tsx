"use client"

import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { toast } from "sonner"

import { ListingThumb } from "@/components/inbox/listing-thumb"
import { KeepAdsPrompt } from "@/components/sign-in-form"
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

const filters: ListingStatusFilter[] = ["all", "active", "paused", "sold", "expired"]
const swipeReveal = 144

export function MyAdsPage() {
  const { ready, listings, removeListing, setListingSold, setListingPaused, renewListing } = useMarketplace()
  const mine = useMemo(() => listings.filter((listing) => listing.mine), [listings])
  const postHref = postAdHref(useRememberedPlace())
  const [filter, setFilter] = useState<ListingStatusFilter>("all")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const pending = mine.find((listing) => listing.id === pendingId)

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
        label: "Undo",
        onClick: () => {
          void undo().catch(() => toast.error("Could not undo that change."))
        },
      },
    })
  }, [])

  async function onSold(listing: Listing, sold: boolean) {
    setBusyId(listing.id)
    const result = await setListingSold(listing.id, sold)
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    if (sold) {
      withUndo("Marked as sold", async () => {
        const undo = await setListingSold(listing.id, false)
        if (!undo.ok) throw new Error(undo.reason)
        toast.success("Marked as available")
      })
    } else {
      toast.success("Marked as available")
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
      withUndo("Ad paused", async () => {
        const undo = await setListingPaused(listing.id, false)
        if (!undo.ok) throw new Error(undo.reason)
        toast.success("Ad resumed")
      })
    } else {
      toast.success("Ad resumed")
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
    toast.success("Ad renewed — it is back on the board")
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
      toast.success("Link copied")
    } catch {
      toast.error("Could not share this ad")
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
    toast.success("Ad removed")
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-[1720px] px-4 py-3 md:px-6">
        <p className="text-sm text-neutral-500">Loading your ads…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-3 md:px-6">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm font-semibold text-neutral-950">My ads</h1>
            <Button asChild size="sm" className="h-8 rounded-lg px-3 text-xs">
              <Link href={postHref}>Post an ad</Link>
            </Button>
          </div>
          <KeepAdsPrompt className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950" />
          <div
            className="mt-3 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Filter ads"
          >
            {filters.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
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
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-neutral-500">
            {mine.length === 0
              ? "You have not posted an ad yet."
              : filter === "all"
                ? "No ads to show."
                : `No ${listingStatusLabel(filter).toLowerCase()} ads.`}
          </p>
        ) : (
          <ul className="min-w-0 divide-y divide-neutral-100">
            {visible.map((listing) => (
              <MyAdRow
                key={listing.id}
                listing={listing}
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
            <DialogTitle>Remove this ad?</DialogTitle>
            <DialogDescription>
              {pending ? `“${pending.title}” will leave the board and its photos will be deleted.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingId(null)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={busyId === pendingId} onClick={() => void onRemove()}>
              Remove ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MyAdRow({
  listing,
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
          "relative flex min-w-0 items-stretch gap-3 bg-white px-4 py-4",
          !reduceMotion && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${offset}px)` }}
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
      axis.current = "undecided"
      startX.current = event.clientX
      startY.current = event.clientY
      startOffset.current = dragRef.current ?? resting
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!tracking.current) return
      const dx = event.clientX - startX.current
      const dy = event.clientY - startY.current
      if (axis.current === "undecided") {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
        if (axis.current === "y") {
          tracking.current = false
          return
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
    onPointerUp: () => {
      if (!tracking.current && axis.current !== "x") {
        tracking.current = false
        return
      }
      tracking.current = false
      if (axis.current !== "x") return
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
    onPointerCancel: () => {
      tracking.current = false
      setDragOffset(null)
    },
  }

  return { offset, handlers }
}
