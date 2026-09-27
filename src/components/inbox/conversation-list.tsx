"use client"

import { Search } from "lucide-react"
import Link from "next/link"

import { ListingThumb } from "@/components/inbox/listing-thumb"
import { Input } from "@/components/ui/input"
import { formatPosted } from "@/lib/format"
import type { MessageThread } from "@/lib/messages"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export type InboxFilter = "all" | "unread"

export function ConversationList({
  threads,
  listings,
  activeId,
  sample,
  search,
  onSearch,
  filter,
  onFilter,
  unread,
  hidden,
}: {
  threads: MessageThread[]
  listings: Map<string, Listing>
  activeId?: string
  sample: boolean
  search: string
  onSearch: (value: string) => void
  filter: InboxFilter
  onFilter: (filter: InboxFilter) => void
  unread: number
  hidden: boolean
}) {
  return (
    <aside className={cn("min-w-0 flex-col border-neutral-200 lg:flex lg:border-r", hidden ? "hidden" : "flex")} aria-label="Conversations">
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-950">Conversations</h2>
          <span className="text-xs text-neutral-500">{threads.length} shown</span>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search messages or listings" aria-label="Search messages or listings" className="h-9 rounded-lg bg-neutral-50 pl-9 text-sm" />
        </div>
        <div className="mt-3 flex gap-1" aria-label="Filter conversations">
          {(["all", "unread"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => onFilter(option)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium", filter === option ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100")}
            >
              {option === "all" ? "All" : `Unread${unread ? ` ${unread}` : ""}`}
            </button>
          ))}
        </div>
      </div>
      {threads.length ? (
        <ul className="min-w-0 divide-y divide-neutral-100 lg:max-h-[min(69dvh,47rem)] lg:overflow-y-auto">
          {threads.map((thread) => (
            <ConversationRow key={thread.conversationId} thread={thread} listing={listings.get(thread.listingId)} active={activeId === thread.conversationId} sample={sample} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-12 text-center text-sm text-neutral-500">
          {filter === "unread" ? "No unread conversations." : `No conversations match “${search.trim()}”.`}
        </p>
      )}
    </aside>
  )
}

function ConversationRow({ thread, listing, active, sample }: { thread: MessageThread; listing?: Listing; active: boolean; sample: boolean }) {
  const preview = thread.messages.at(-1)
  return (
    <li>
      <Link
        href={`/messages?${sample ? "demo" : "c"}=${encodeURIComponent(thread.conversationId)}`}
        aria-current={active ? "page" : undefined}
        className={cn("flex min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-950", thread.unread > 0 && "bg-blue-50/40", active && "bg-neutral-100")}
      >
        <ListingThumb listing={listing} className="size-12" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-2">
            <span className={cn("truncate text-sm text-neutral-950", thread.unread ? "font-semibold" : "font-medium")}>{listing?.title ?? thread.listingTitle}</span>
            <span className="shrink-0 text-[11px] text-neutral-500">{sample ? "Sample" : formatWhen(thread.latestAt)}</span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-neutral-600">
            <span className="truncate">{thread.viewerIsSeller ? "Buyer" : "Seller"}: {thread.peerName}</span>
            {thread.unread ? <span className="ml-auto shrink-0 rounded-full bg-neutral-950 px-1.5 text-[10px] text-white" aria-label={`${thread.unread} unread`}>{thread.unread}</span> : null}
          </span>
          <span className="mt-1 block truncate text-xs text-neutral-500">{preview?.fromMe ? "You: " : ""}{preview?.body}</span>
        </span>
      </Link>
    </li>
  )
}

function formatWhen(sentAt: string) {
  const time = new Date(sentAt).getTime()
  return Number.isNaN(time) ? "" : formatPosted((Date.now() - time) / 3_600_000)
}
