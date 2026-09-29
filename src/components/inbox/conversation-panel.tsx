"use client"

import { ArrowLeft, ArrowUpRight, MessageCircle } from "lucide-react"
import Link from "next/link"

import { ListingThumb } from "@/components/inbox/listing-thumb"
import { MessageHistory } from "@/components/inbox/message-history"
import { ReplyForm } from "@/components/inbox/reply-form"
import { Button } from "@/components/ui/button"
import { formatPlace, formatPrice } from "@/lib/format"
import type { MessageThread } from "@/lib/messages"
import type { Listing } from "@/lib/types"

export function ConversationPanel({
  thread,
  listing,
  sending,
  onBack,
  onSend,
}: {
  thread: MessageThread | null
  listing?: Listing
  sending: boolean
  onBack: () => void
  onSend: (draft: string) => Promise<boolean>
}) {
  return (
    <section className={thread ? "min-h-0 min-w-0" : "hidden min-h-0 min-w-0 lg:block"} aria-label="Selected conversation">
      {thread ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 sm:px-5">
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="All conversations" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">{thread.viewerIsSeller ? "Selling" : "Buying"} · Messenger</p>
              <p className="truncate text-sm font-semibold text-neutral-950">{thread.peerName}</p>
            </div>
          </div>
          <OfferContext thread={thread} listing={listing} />
          <MessageHistory conversationId={thread.conversationId} messages={thread.messages} />
          <ReplyForm key={thread.conversationId} placeholder={thread.viewerIsSeller ? "Reply to the buyer…" : "Write another message…"} sending={sending} onSend={onSend} />
        </div>
      ) : (
        <div className="flex h-full min-h-[30rem] flex-col items-center justify-center px-6 text-center">
          <MessageCircle className="size-7 text-neutral-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-neutral-800">Select a conversation</p>
          <p className="mt-1 text-xs text-neutral-500">Each conversation is about a listing.</p>
        </div>
      )}
    </section>
  )
}

function OfferContext({ thread, listing }: { thread: MessageThread; listing?: Listing }) {
  const content = (
    <>
      <ListingThumb listing={listing} className="size-14 sm:size-16" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">Listing</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-neutral-950">{listing?.title ?? thread.listingTitle}</span>
        <span className="mt-0.5 block truncate text-xs text-neutral-600">{listing ? `${formatPrice(listing)} · ${formatPlace(listing)}` : "Listing no longer available"}</span>
      </span>
      {listing ? <ArrowUpRight className="size-4 shrink-0 text-neutral-500" aria-hidden="true" /> : null}
    </>
  )
  return listing ? (
    <Link href={`/listings/${encodeURIComponent(thread.listingId)}`} className="flex min-w-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-950 sm:px-5" aria-label={`View listing: ${thread.listingTitle}`}>
      {content}
    </Link>
  ) : (
    <div className="flex min-w-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-5">
      {content}
    </div>
  )
}
