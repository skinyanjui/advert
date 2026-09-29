"use client"

import { Search } from "lucide-react"
import Link from "next/link"

import { ListingThumb } from "@/components/inbox/listing-thumb"
import { usePrefs } from "@/components/prefs-provider"
import { NavBadge } from "@/components/nav-badge"
import { Input } from "@/components/ui/input"
import type { MessageThread } from "@/lib/messages"
import { formatMessageWhen } from "@/lib/relative-time"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export type InboxFilter = "all" | "unread"

export function ConversationList({
  threads,
  listings,
  activeId,
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
  search: string
  onSearch: (value: string) => void
  filter: InboxFilter
  onFilter: (filter: InboxFilter) => void
  unread: number
  hidden: boolean
}) {
  const { t } = usePrefs()
  return (
    <aside className={cn("min-w-0 flex-col border-neutral-200 lg:flex lg:border-r", hidden ? "hidden" : "flex")} aria-label={t("inbox.title")}>
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-950">{t("inbox.title")}</h2>
          <span className="text-xs text-neutral-500">{t("inbox.conversations", { count: threads.length })}</span>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t("inbox.searchPlaceholder")} aria-label={t("inbox.searchPlaceholder")} className="h-9 rounded-lg bg-neutral-50 pl-9 text-sm" />
        </div>
        <div className="mt-3 flex gap-1" aria-label={t("inbox.filterConversations")}>
          {(["all", "unread"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => onFilter(option)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium", filter === option ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100")}
            >
              {option === "all" ? t("inbox.filterAll") : `${t("inbox.filterUnread")}${unread ? ` ${unread}` : ""}`}
            </button>
          ))}
        </div>
      </div>
      {threads.length ? (
        <ul className="min-w-0 divide-y divide-neutral-100 overflow-y-auto">
          {threads.map((thread) => (
            <ConversationRow key={thread.conversationId} thread={thread} listing={listings.get(thread.listingId)} active={activeId === thread.conversationId} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-12 text-center text-sm text-neutral-500">
          {filter === "unread" ? t("inbox.emptyUnread") : t("inbox.emptySearch", { query: search.trim() })}
        </p>
      )}
    </aside>
  )
}

function ConversationRow({ thread, listing, active }: { thread: MessageThread; listing?: Listing; active: boolean }) {
  const { t } = usePrefs()
  const preview = thread.messages.at(-1)
  return (
    <li>
      <Link
        href={`/messages?c=${encodeURIComponent(thread.conversationId)}`}
        aria-current={active ? "page" : undefined}
        className={cn("flex min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-950", thread.unread > 0 && "bg-blue-50/40", active && "bg-neutral-100")}
      >
        <ListingThumb listing={listing} className="size-12" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-2">
            <span className={cn("truncate text-sm text-neutral-950", thread.unread ? "font-semibold" : "font-medium")}>{listing?.title ?? thread.listingTitle}</span>
            <span className="shrink-0 text-[11px] text-neutral-500">{formatMessageWhen(thread.latestAt)}</span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-neutral-600">
            <span className="truncate">{thread.viewerIsSeller ? t("inbox.buyer") : t("inbox.seller")}: {thread.peerName}</span>
            {thread.unread ? (
              <NavBadge
                count={thread.unread}
                placement="inline"
                className="ml-auto"
                ariaLabel={t("nav.unreadMessages", { count: thread.unread })}
              />
            ) : null}
          </span>
          <span className="mt-1 block truncate text-xs text-neutral-500">{preview?.fromMe ? t("inbox.youPrefix") : ""}{preview?.body}</span>
        </span>
      </Link>
    </li>
  )
}
