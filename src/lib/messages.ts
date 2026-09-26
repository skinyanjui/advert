export type MessageRole = "you" | "sample"

export type BoardMessage = {
  id: string
  listingId: string
  listingTitle: string
  sellerName: string
  body: string
  sentAt: string
  role: MessageRole
  read: boolean
}

export type MessageThread = {
  listingId: string
  listingTitle: string
  sellerName: string
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

export function sampleReply(title: string): string {
  return `Thanks for asking about ${title}. This sample reply is saved on this browser with your message. Call the number on the ad to arrange the next step.`
}

export function messageThreads(messages: BoardMessage[]): MessageThread[] {
  const groups = new Map<string, BoardMessage[]>()
  for (const message of messages) {
    const group = groups.get(message.listingId)
    if (group) group.push(message)
    else groups.set(message.listingId, [message])
  }
  return [...groups.entries()]
    .map(([listingId, items]) => {
      const latest = items[items.length - 1]
      return {
        listingId,
        listingTitle: latest?.listingTitle ?? "",
        sellerName: latest?.sellerName ?? "",
        messages: items,
        unread: items.filter((item) => !item.read).length,
        latestAt: latest?.sentAt ?? "",
      }
    })
    .sort((left, right) => (left.latestAt < right.latestAt ? 1 : left.latestAt > right.latestAt ? -1 : 0))
}

export function isBoardMessage(value: unknown): value is BoardMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<BoardMessage>
  return (
    typeof message.id === "string" &&
    typeof message.listingId === "string" &&
    typeof message.listingTitle === "string" &&
    typeof message.sellerName === "string" &&
    typeof message.body === "string" &&
    typeof message.sentAt === "string" &&
    isMessageRole(message.role) &&
    typeof message.read === "boolean"
  )
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "you" || value === "sample"
}
