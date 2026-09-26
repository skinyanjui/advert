import assert from "node:assert/strict"
import { test } from "node:test"

import {
  isBoardMessage,
  messageError,
  messageThreads,
  unreadMessageCount,
  type BoardMessage,
} from "../src/lib/messages"

function sample(overrides: Partial<BoardMessage> = {}): BoardMessage {
  return {
    id: "m1",
    conversationId: "c1",
    listingId: "ad1",
    listingTitle: "Toyota",
    sellerName: "Amina",
    peerName: "Buyer",
    body: "Is this still available today?",
    sentAt: "2026-09-26T10:00:00.000Z",
    senderId: "buyer-1",
    role: "buyer",
    fromMe: false,
    read: false,
    viewerIsSeller: true,
    ...overrides,
  }
}

test("messageError enforces length", () => {
  assert.equal(messageError("short"), "Write at least 8 characters.")
  assert.equal(messageError("a".repeat(1001)), "Use a shorter message.")
  assert.equal(messageError("Is this still available?"), undefined)
})

test("messageThreads groups by conversation and sorts by latest", () => {
  const older = sample({
    id: "m1",
    conversationId: "c-old",
    sentAt: "2026-09-25T10:00:00.000Z",
    body: "Older thread message body",
  })
  const newer = sample({
    id: "m2",
    conversationId: "c-new",
    listingId: "ad2",
    sentAt: "2026-09-26T12:00:00.000Z",
    body: "Newer thread message body",
  })
  const reply = sample({
    id: "m3",
    conversationId: "c-new",
    listingId: "ad2",
    sentAt: "2026-09-26T13:00:00.000Z",
    role: "seller",
    fromMe: true,
    read: true,
    body: "Yes, still available this week",
  })
  const threads = messageThreads([older, newer, reply])
  assert.equal(threads.length, 2)
  assert.equal(threads[0]?.conversationId, "c-new")
  assert.equal(threads[0]?.messages.length, 2)
  assert.equal(threads[0]?.unread, 1)
  assert.equal(threads[1]?.conversationId, "c-old")
})

test("unreadMessageCount ignores own messages", () => {
  const messages = [
    sample({ id: "a", fromMe: false, read: false }),
    sample({ id: "b", fromMe: true, read: false, role: "seller" }),
    sample({ id: "c", fromMe: false, read: true }),
  ]
  assert.equal(unreadMessageCount(messages), 1)
})

test("isBoardMessage rejects legacy sample-reply shape", () => {
  assert.equal(
    isBoardMessage({
      id: "x",
      listingId: "ad1",
      listingTitle: "Toyota",
      sellerName: "Amina",
      body: "Hello there friend",
      sentAt: "2026-09-26T10:00:00.000Z",
      role: "you",
    }),
    false,
  )
  assert.equal(isBoardMessage(sample()), true)
})
