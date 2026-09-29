import assert from "node:assert/strict"
import test from "node:test"

import {
  deriveWhatsAppEnforcementState,
  whatsappSendAllowed,
} from "../src/lib/whatsapp-platform-policy"

test("warning does not block service messaging", () => {
  assert.deepEqual(
    whatsappSendAllowed({ wabaId: "w1", state: "warning" }, "service"),
    { allowed: true },
  )
})

test("template restriction blocks marketing utility and authentication but not service", () => {
  const status = { wabaId: "w1", state: "template_restricted" as const }
  assert.equal(whatsappSendAllowed(status, "marketing").allowed, false)
  assert.equal(whatsappSendAllowed(status, "utility").allowed, false)
  assert.equal(whatsappSendAllowed(status, "authentication").allowed, false)
  assert.equal(whatsappSendAllowed(status, "service").allowed, true)
})

test("all message restriction fails closed", () => {
  assert.equal(
    whatsappSendAllowed({ wabaId: "w1", state: "all_messages_restricted" }, "service").allowed,
    false,
  )
})

test("lock and disable always block sends", () => {
  assert.equal(whatsappSendAllowed({ wabaId: "w1", state: "account_locked" }, "service").allowed, false)
  assert.equal(whatsappSendAllowed({ wabaId: "w1", state: "disabled" }, "marketing").allowed, false)
})

test("webhook payload derives enforcement state conservatively", () => {
  assert.equal(deriveWhatsAppEnforcementState({ warning: "policy violation" }).state, "warning")
  assert.equal(deriveWhatsAppEnforcementState({ restriction: "marketing templates blocked for 3 days" }).state, "template_restricted")
  assert.equal(deriveWhatsAppEnforcementState({ restriction: "all messages blocked for 7 days" }).state, "all_messages_restricted")
  assert.equal(deriveWhatsAppEnforcementState({ status: "account locked" }).state, "account_locked")
  assert.equal(deriveWhatsAppEnforcementState({ status: "permanently disabled" }).state, "disabled")
})
