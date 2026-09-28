import type { MessageRole, MessageThread } from "@/lib/messages"

export const sampleThreads: MessageThread[] = [
  sampleThread("land-cruiser-79", "Toyota Land Cruiser 79", "James Otieno", "Example buyer", true, [
    ["buyer", "Is the Land Cruiser still available? Could I view it this week?"],
    ["seller", "It is available. We could arrange a viewing in Kilimani."],
  ]),
  sampleThread("kigali-house", "2 bedroom house for rent", "Aline Uwase", "Aline Uwase", false, [
    ["buyer", "Hello, is the house available from next month?"],
    ["seller", "Yes, it is. Would you like to arrange a viewing?"],
  ]),
  sampleThread("macbook-pro-m2", "MacBook Pro M2", "Hassan Juma", "Example buyer", true, [
    ["buyer", "Does the MacBook include the original charger?"],
    ["seller", "Yes, the charger and a sleeve are included."],
  ]),
]

function sampleThread(
  listingId: string,
  listingTitle: string,
  sellerName: string,
  peerName: string,
  viewerIsSeller: boolean,
  exchange: [MessageRole, string][],
): MessageThread {
  const conversationId = `sample-${listingId}`
  const messages = exchange.map(([role, body], index) => ({
    id: `${conversationId}-${index}`,
    conversationId,
    listingId,
    listingTitle,
    sellerName,
    peerName,
    body,
    sentAt: `2026-09-26T${10 + index}:00:00.000Z`,
    senderId: `sample-${role}`,
    role,
    fromMe: (role === "seller") === viewerIsSeller,
    read: true,
    viewerIsSeller,
  }))
  return {
    conversationId,
    listingId,
    listingTitle,
    sellerName,
    peerName,
    viewerIsSeller,
    messages,
    unread: 0,
    latestAt: messages.at(-1)?.sentAt ?? "",
  }
}
