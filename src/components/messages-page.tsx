"use client"

import { ArrowLeft, ArrowUpRight, Inbox, MessageCircle, Search, Send, UserRound } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatPosted } from "@/lib/format"
import { messageThreads, type MessageRole, type MessageThread } from "@/lib/messages"
import { useMarketplace } from "@/lib/marketplace"

export function MessagesPage() {
  const { ready, messages, markThreadRead, sendMessage } = useMarketplace()
  const params = useSearchParams()
  const router = useRouter()
  const threads = useMemo(() => messageThreads(messages), [messages])
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return threads
    return threads.filter((thread) =>
      `${thread.peerName} ${thread.listingTitle} ${thread.messages.at(-1)?.body ?? ""}`.toLocaleLowerCase().includes(term),
    )
  }, [search, threads])
  const unreadTotal = threads.reduce((count, thread) => count + thread.unread, 0)
  const requestedConversation = params.get("c")
  const requestedListing = params.get("listing")
  const selected =
    threads.find((thread) => thread.conversationId === requestedConversation) ??
    threads.find((thread) => thread.listingId === requestedListing) ??
    null
  const wide = useWide()
  const missing = Boolean(requestedConversation || requestedListing) && !threads.some((thread) =>
    thread.conversationId === requestedConversation || thread.listingId === requestedListing,
  )
  const visible = selected ?? (!requestedConversation && !requestedListing && wide ? (filtered[0] ?? null) : null)
  const visibleId = visible?.conversationId
  const visibleUnread = visible?.unread ?? 0
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (visibleId && visibleUnread > 0) markThreadRead(visibleId)
  }, [markThreadRead, visibleId, visibleUnread])

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-2 text-sm text-neutral-500">Loading your messages…</p>
      </div>
    )
  }

  async function reply(draft: string) {
    if (!visible) return { ok: false as const, reason: "Choose a conversation." }
    setSending(true)
    const result = await sendMessage(visible.listingId, draft, visible.conversationId)
    setSending(false)
    if (!result.ok) return result
    toast.success("Reply sent")
    return result
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {threads.length === 0
              ? "Your conversations about listings will appear here."
              : `${threads.length} conversation${threads.length === 1 ? "" : "s"}${unreadTotal ? ` · ${unreadTotal} unread` : ""}`}
          </p>
        </div>
        {threads.length > 0 ? <MessageCircle className="mb-1 hidden size-5 text-neutral-400 sm:block" aria-hidden="true" /> : null}
      </div>
      {threads.length === 0 ? (
        <div className="mt-6 flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700"><Inbox className="size-6" /></span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">No conversations yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
            Message a seller from a live listing. When someone asks about your ad, you can reply here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild className="rounded-full"><Link href="/">Browse listings</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/my-ads">My ads</Link></Button>
          </div>
        </div>
      ) : (
        <>
          {missing ? (
            <p className="mt-4 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600">This conversation is not on this account. Choose one below.</p>
          ) : null}
          <div className="mt-5 grid min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:min-h-[34rem] lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className={`${visible && !wide ? "hidden" : "flex"} min-w-0 flex-col lg:border-r border-neutral-200`} aria-label="Conversations">
              <div className="border-b border-neutral-200 px-4 py-4">
                <h2 className="text-sm font-semibold">Conversations</h2>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="h-9 rounded-full bg-neutral-50 pl-9 text-sm" />
                </div>
              </div>
              {filtered.length > 0 ? (
                <ul className="min-w-0 divide-y divide-neutral-100 lg:max-h-[min(70vh,44rem)] lg:overflow-y-auto">
                  {filtered.map((thread) => <ConversationItem key={thread.conversationId} thread={thread} active={visible?.conversationId === thread.conversationId} />)}
                </ul>
              ) : <p className="px-4 py-10 text-center text-sm text-neutral-500">No conversations match “{search.trim()}”.</p>}
            </aside>
            <section className={visible ? "min-w-0" : "hidden min-w-0 lg:block"} aria-label="Selected conversation">
              {visible ? (
                <div className="flex h-full min-w-0 flex-col">
                  <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      aria-label="All messages"
                      onClick={() => router.push("/messages")}
                    >
                      <ArrowLeft />
                    </Button>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"><UserRound className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{visible.peerName}</p>
                      <Link
                        href={`/listings/${visible.listingId}`}
                        className="block truncate text-xs text-neutral-500 hover:text-neutral-900"
                      >
                        {visible.listingTitle}
                      </Link>
                    </div>
                    <Button asChild variant="ghost" size="icon-sm" className="shrink-0 rounded-full"><Link href={`/listings/${visible.listingId}`} aria-label={`View ${visible.listingTitle}`}><ArrowUpRight className="size-4" /></Link></Button>
                  </div>
                  <MessageHistory conversationId={visible.conversationId} messages={visible.messages} />
                  <ReplyForm
                    key={visible.conversationId}
                    placeholder={visible.viewerIsSeller ? "Reply to the buyer…" : "Write another message…"}
                    sending={sending}
                    onSend={async (draft) => {
                      const result = await reply(draft)
                      if (!result.ok) toast.error(result.reason)
                      return result.ok
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-[28rem] flex-col items-center justify-center px-6 text-center">
                  <MessageCircle className="size-7 text-neutral-300" aria-hidden="true" />
                  <p className="mt-3 text-sm text-neutral-500">Choose a conversation to read and reply.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function ConversationItem({ thread, active }: { thread: MessageThread; active: boolean }) {
  const preview = thread.messages.at(-1)
  return (
    <li>
      <Link
        href={`/messages?c=${encodeURIComponent(thread.conversationId)}`}
        aria-current={active ? "page" : undefined}
        className={`flex min-w-0 gap-3 px-4 py-3.5 transition-colors ${active ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"><UserRound className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${thread.unread ? "font-semibold" : "font-medium"}`}>{thread.peerName}</span>
            <span className="shrink-0 text-[11px] text-neutral-500">{formatWhen(thread.latestAt)}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-neutral-500">
            {thread.viewerIsSeller ? "Selling" : "Buying"} · {thread.listingTitle}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">{preview?.fromMe ? "You: " : ""}{preview?.body}</span>
            {thread.unread > 0 ? <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-medium text-white" aria-label={`${thread.unread} unread`}>{thread.unread}</span> : null}
          </span>
        </span>
      </Link>
    </li>
  )
}

function MessageHistory({ conversationId, messages }: { conversationId: string; messages: MessageThread["messages"] }) {
  const historyRef = useRef<HTMLOListElement>(null)
  const lastId = messages.at(-1)?.id
  useEffect(() => {
    const history = historyRef.current
    if (history) history.scrollTop = history.scrollHeight
  }, [conversationId, lastId])

  return (
    <ol ref={historyRef} aria-label="Messages" className="flex min-h-[18rem] max-h-[min(55dvh,36rem)] flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
      {messages.map((message) => (
        <MessageBubble key={message.id} role={message.role} fromMe={message.fromMe} body={message.body} sentAt={message.sentAt} />
      ))}
    </ol>
  )
}

function ReplyForm({
  placeholder,
  sending,
  onSend,
}: {
  placeholder: string
  sending: boolean
  onSend: (draft: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState("")
  const submitting = useRef(false)
  return (
    <form
      className="grid gap-2 border-t border-neutral-200 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (sending || submitting.current) return
        submitting.current = true
        void onSend(draft)
          .then((ok) => { if (ok) setDraft("") })
          .catch(() => toast.error("Could not send the message."))
          .finally(() => { submitting.current = false })
      }}
    >
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label="Write a message"
        maxLength={1000}
        rows={2}
        className="resize-none rounded-xl"
      />
      <Button type="submit" disabled={sending || draft.trim().length < 8} className="justify-self-end rounded-full">
        <Send className="size-4" />
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  )
}

function MessageBubble({
  role,
  fromMe,
  body,
  sentAt,
}: {
  role: MessageRole
  fromMe: boolean
  body: string
  sentAt: string
}) {
  const when = formatWhen(sentAt)
  const label = role === "seller" ? "Seller" : "Buyer"
  if (fromMe) {
    return (
      <li className="ml-auto max-w-[85%] rounded-2xl bg-neutral-950 px-3 py-2 text-sm text-white">
        <p className="leading-6 break-words">{body}</p>
        <p className="mt-1 text-[11px] text-neutral-300">{when}</p>
      </li>
    )
  }
  return (
    <li className="max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-900">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 leading-6 break-words">{body}</p>
      <p className="mt-1 text-[11px] text-neutral-500">{when}</p>
    </li>
  )
}

function formatWhen(sentAt: string): string {
  const time = new Date(sentAt).getTime()
  if (Number.isNaN(time)) return ""
  return formatPosted((Date.now() - time) / 3_600_000)
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
