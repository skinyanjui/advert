"use client"

import { useEffect, useRef } from "react"

import { formatMessageWhen } from "@/lib/relative-time"
import type { BoardMessage, MessageRole } from "@/lib/messages"

export function MessageHistory({ conversationId, messages }: { conversationId: string; messages: BoardMessage[] }) {
  const historyRef = useRef<HTMLOListElement>(null)
  const lastId = messages.at(-1)?.id

  useEffect(() => {
    const history = historyRef.current
    if (history) history.scrollTop = history.scrollHeight
  }, [conversationId, lastId])

  return (
    <ol ref={historyRef} aria-label="Messages about this listing" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-neutral-50/60 px-4 py-5 sm:px-5">
      {messages.map((message) => (
        <MessageBubble key={message.id} role={message.role} fromMe={message.fromMe} body={message.body} sentAt={message.sentAt} />
      ))}
    </ol>
  )
}

function MessageBubble({ role, fromMe, body, sentAt }: { role: MessageRole; fromMe: boolean; body: string; sentAt: string }) {
  const when = formatMessageWhen(sentAt)
  return (
    <li className={fromMe ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-neutral-950 px-3 py-2 text-sm text-white" : "max-w-[85%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950"}>
      {!fromMe ? <p className="text-[11px] font-medium text-neutral-500">{role === "seller" ? "Seller" : "Buyer"}</p> : null}
      <p className="leading-6 break-words">{body}</p>
      <p className={fromMe ? "mt-1 text-[11px] text-neutral-300" : "mt-1 text-[11px] text-neutral-500"}>{when}</p>
    </li>
  )
}
