import assert from "node:assert/strict"
import test from "node:test"

import {
  validWhatsAppWebhookSignature,
  whatsappAccountUpdates,
} from "../src/lib/whatsapp-webhook"

test("WhatsApp webhook signature verification uses sha256 HMAC", async () => {
  const { createHmac } = await import("node:crypto")
  const raw = JSON.stringify({ ok: true })
  const secret = "test-secret"
  const signature = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex")

  assert.equal(validWhatsAppWebhookSignature(raw, signature, secret), true)
  assert.equal(validWhatsAppWebhookSignature(raw + "x", signature, secret), false)
  assert.equal(validWhatsAppWebhookSignature(raw, null, secret), false)
})

test("only account_update webhook changes are accepted", () => {
  const updates = whatsappAccountUpdates({
    entry: [
      {
        id: "waba-123",
        changes: [
          { field: "messages", value: { ignored: true } },
          { field: "account_update", value: { event: "warning" } },
        ],
      },
    ],
  })

  assert.deepEqual(updates, [
    { wabaId: "waba-123", value: { event: "warning" } },
  ])
})
