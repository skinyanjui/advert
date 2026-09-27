export type MessageRole = "buyer" | "seller"

export type BoardMessage = {
  id: string
  conversationId: string
  listingId: string
  listingTitle: string
  sellerName: string
  /** Display name for the other party in the thread list. */
  peerName: string
  body: string
  sentAt: string
  senderId: string
  role: MessageRole
  fromMe: boolean
  /** False when this message is from the peer and newer than the viewer's last read. */
  read: boolean
  viewerIsSeller: boolean
}

export type MessageThread = {
  conversationId: string
  listingId: string
  listingTitle: string
  sellerName: string
  peerName: string
  viewerIsSeller: boolean
  messages: BoardMessage[]
  unread: number
  latestAt: string
}

const minLength = 8
const maxLength = 1000

export function messageError(body: string): string | undefined {
  const text = body.trim()
  if (text.length < minLength) return "Write at least 8 characters."
  if (text.length > maxLength) return "Use a shorter message."
  return undefined
}

export function messageThreads(messages: BoardMessage[]): MessageThread[] {
  const groups = new Map<string, BoardMessage[]>()
  for (const message of messages) {
    const group = groups.get(message.conversationId)
    if (group) group.push(message)
    else groups.set(message.conversationId, [message])
  }
  return [...groups.entries()]
    .map(([conversationId, items]) => {
      const latest = items[items.length - 1]
      const first = items[0]
      return {
        conversationId,
        listingId: first?.listingId ?? "",
        listingTitle: first?.listingTitle ?? "",
        sellerName: first?.sellerName ?? "",
        peerName: first?.peerName ?? "",
        viewerIsSeller: first?.viewerIsSeller ?? false,
        messages: items,
        unread: items.filter((item) => !item.read && !item.fromMe).length,
        latestAt: latest?.sentAt ?? "",
      }
    })
    .sort((left, right) => (left.latestAt < right.latestAt ? 1 : left.latestAt > right.latestAt ? -1 : 0))
}

export function unreadMessageCount(messages: BoardMessage[]): number {
  return messages.filter((item) => !item.read && !item.fromMe).length
}

/** Show unread incoming messages first, then the latest messages already opened in the inbox. */
export function recentMessageNotifications(messages: BoardMessage[], limit = 6): BoardMessage[] {
  const incoming = messages.filter((message) => !message.fromMe)
  const newestFirst = (left: BoardMessage, right: BoardMessage) => right.sentAt.localeCompare(left.sentAt)
  const unread = incoming.filter((message) => !message.read).sort(newestFirst).slice(0, limit)
  const read = incoming.filter((message) => message.read).sort(newestFirst).slice(0, limit - unread.length)
  return [...unread, ...read]
}

export function isBoardMessage(value: unknown): value is BoardMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<BoardMessage>
  return (
    typeof message.id === "string" &&
    typeof message.conversationId === "string" &&
    typeof message.listingId === "string" &&
    typeof message.listingTitle === "string" &&
    typeof message.sellerName === "string" &&
    typeof message.peerName === "string" &&
    typeof message.body === "string" &&
    typeof message.sentAt === "string" &&
    typeof message.senderId === "string" &&
    isMessageRole(message.role) &&
    typeof message.fromMe === "boolean" &&
    typeof message.read === "boolean" &&
    typeof message.viewerIsSeller === "boolean"
  )
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "buyer" || value === "seller"
}
