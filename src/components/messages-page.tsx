"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { formatPosted } from "@/lib/format"
import { messageThreads, type MessageRole } from "@/lib/messages"
import { useMarketplace } from "@/lib/marketplace"

export function MessagesPage() {
  const { ready, messages, markThreadRead } = useMarketplace()
  const params = useSearchParams()
  const router = useRouter()
  const threads = messageThreads(messages)
  const requested = params.get("listing")
  const selected = threads.find((thread) => thread.listingId === requested) ?? null
  const wide = useWide()
  const missing = Boolean(requested) && !selected
  const visible = selected ?? (!requested && wide ? (threads[0] ?? null) : null)
  const visibleId = visible?.listingId
  const visibleUnread = visible?.unread ?? 0

  useEffect(() => {
    if (visibleId && visibleUnread > 0) markThreadRead(visibleId)
  }, [markThreadRead, visibleId, visibleUnread])

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-2 text-sm text-neutral-500">Loading your messages…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Notes you send stay on this browser with a sample reply. Sellers do not receive an inbox yet — call or WhatsApp the
        number on the ad to reach them.
      </p>
      {threads.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold tracking-tight">No messages yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
            Open a listing and write to the seller. The thread waits for you here.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link href="/">Browse listings</Link>
          </Button>
        </div>
      ) : (
        <>
        {missing ? (
          <p className="mt-4 text-sm text-neutral-500">This conversation is not on this browser.</p>
        ) : null}
        <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ul className={visible && !wide ? "hidden" : "grid min-w-0 gap-2 overflow-hidden"}>
            {threads.map((thread) => {
              const active = visible?.listingId === thread.listingId
              const preview = thread.messages[thread.messages.length - 1]
              return (
                <li key={thread.listingId} className="min-w-0">
                  <Link
                    href={`/messages?listing=${thread.listingId}`}
                    className={`block min-w-0 overflow-hidden rounded-2xl border px-3 py-3 ${
                      active ? "border-neutral-950 bg-white" : "border-neutral-200 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{thread.sellerName}</span>
                      {thread.unread > 0 ? <span className="size-2 shrink-0 rounded-full bg-rose-500" /> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">{thread.listingTitle}</span>
                    {preview ? (
                      <span className="mt-1 block truncate text-xs text-neutral-600">{preview.body}</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
          <section className={visible ? "min-w-0" : "hidden lg:block"}>
            {visible ? (
              <div className="rounded-2xl border border-neutral-200 bg-white">
                <div className="flex items-start gap-3 border-b px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="All messages"
                    onClick={() => router.push("/messages")}
                  >
                    <ArrowLeft />
                  </Button>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{visible.sellerName}</p>
                    <Link
                      href={`/listings/${visible.listingId}`}
                      className="block truncate text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      {visible.listingTitle}
                    </Link>
                  </div>
                </div>
                <p className="border-b px-4 py-2 text-xs leading-5 text-neutral-500">
                  The grey reply is a sample stored with your message. It is not from the seller.
                </p>
                <ol className="grid gap-3 px-4 py-4">
                  {visible.messages.map((message) => (
                    <MessageBubble key={message.id} role={message.role} body={message.body} sentAt={message.sentAt} />
                  ))}
                </ol>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center">
                <p className="text-sm text-neutral-500">Choose a conversation.</p>
              </div>
            )}
          </section>
        </div>
        </>
      )}
    </div>
  )
}

function MessageBubble({ role, body, sentAt }: { role: MessageRole; body: string; sentAt: string }) {
  const when = formatWhen(sentAt)
  switch (role) {
    case "you":
      return (
        <li className="ml-auto max-w-[85%] rounded-2xl bg-neutral-950 px-3 py-2 text-sm text-white">
          <p className="leading-6 break-words">{body}</p>
          <p className="mt-1 text-[11px] text-neutral-300">{when}</p>
        </li>
      )
    case "sample":
      return (
        <li className="max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-900">
          <p className="text-[11px] font-medium text-neutral-500">Sample reply</p>
          <p className="mt-1 leading-6 break-words">{body}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{when}</p>
        </li>
      )
    default: {
      const unreachable: never = role
      return unreachable
    }
  }
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
