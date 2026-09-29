import assert from "node:assert/strict"
import test from "node:test"

import {
  WHATSAPP_CONSENT_SCOPE,
  WHATSAPP_CONSENT_VERSION,
  whatsappConsentStatement,
} from "../src/lib/whatsapp-consent"

test("WhatsApp consent is listing scoped and names the seller", () => {
  assert.equal(WHATSAPP_CONSENT_SCOPE, "listing_replies")
  assert.match(WHATSAPP_CONSENT_VERSION, /v1$/)
  const text = whatsappConsentStatement("Example Motors", "Toyota Hilux 2021")
  assert.match(text, /Example Motors/)
  assert.match(text, /Toyota Hilux 2021/)
  assert.match(text, /does not include unrelated marketing/)
})
