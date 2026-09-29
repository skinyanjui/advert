"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { ConversationList, type InboxFilter } from "@/components/inbox/conversation-list"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import { ConversationPanel } from "@/components/inbox/conversation-panel"
import { messageThreads } from "@/lib/messages"
import { useMarketplace } from "@/lib/marketplace"

export function MessagesPage() {
  const { ready, messages, listings, markThreadRead, sendMessage } = useMarketplace()
  const auth = useAuth()
  const params = useSearchParams()
  const router = useRouter()
  const threads = useMemo(() => messageThreads(messages), [messages])
  const listingsById = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings])
  const displayThreads = threads
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<InboxFilter>("all")
  const [sending, setSending] = useState(false)
  const wide = useWide()

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return displayThreads.filter((thread) => {
      if (filter === "unread" && !thread.unread) return false
      if (!term) return true
      return `${thread.peerName} ${thread.listingTitle} ${thread.messages.map((message) => message.body).join(" ")}`.toLocaleLowerCase().includes(term)
    })
  }, [displayThreads, filter, search])

  const requestedConversation = params.get("c")
  const requestedListing = params.get("listing")
  const selected =
    threads.find((thread) => thread.conversationId === requestedConversation) ??
    threads.find((thread) => thread.listingId === requestedListing) ??
    null
  const missing = Boolean(requestedConversation || requestedListing) && !selected
  const visible = selected ?? (!missing && wide ? (filtered[0] ?? null) : null)
  const unreadTotal = threads.reduce((count, thread) => count + thread.unread, 0)
  const visibleId = visible?.conversationId
  const visibleUnread = visible?.unread ?? 0

  useEffect(() => {
    if (visibleId && visibleUnread > 0) markThreadRead(visibleId)
  }, [markThreadRead, visibleId, visibleUnread])

  useEffect(() => {
    if (auth.ready && auth.configured && !auth.signedIn) {
      router.replace(signInHref("/messages"))
    }
  }, [auth.configured, auth.ready, auth.signedIn, router])

  if (auth.ready && auth.configured && !auth.signedIn) {
    return (
      <div className="mx-auto w-full max-w-[1720px] px-4 py-6 md:px-6">
        <p className="text-sm text-neutral-500">Sign in to open Messenger.</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-[1720px] px-4 py-6 md:px-6">
        <p className="text-sm text-neutral-500">Loading Messenger…</p>
      </div>
    )
  }

  async function sendReply(draft: string): Promise<boolean> {
    if (!visible) return false
    setSending(true)
    try {
      const result = await sendMessage(visible.listingId, draft, visible.conversationId)
      if (!result.ok) {
        toast.error(result.reason)
        return false
      }
      toast.success("Reply sent")
      return true
    } catch {
      toast.error("Could not send the message.")
      return false
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-3 md:px-6">
      <h1 className="sr-only">Messenger</h1>
      {missing ? (
        <p className="mb-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600">This conversation is not on this account. Choose one below.</p>
      ) : null}
      <div className="grid h-[calc(100dvh-11rem)] min-h-[26rem] min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white md:h-[calc(100dvh-6rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <ConversationList
          threads={filtered}
          listings={listingsById}
          activeId={visible?.conversationId}
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          unread={unreadTotal}
          hidden={Boolean(visible && !wide)}
        />
        <ConversationPanel
          thread={visible}
          listing={visible ? listingsById.get(visible.listingId) : undefined}
          sample={false}
          sending={sending}
          onBack={() => router.push("/messages")}
          onSend={sendReply}
        />
      </div>
    </div>
  )
}

function useWide() {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia("(min-width: 1024px)")
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  )
}
