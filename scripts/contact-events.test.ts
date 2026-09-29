import assert from "node:assert/strict"
import test from "node:test"

import { isContactEventType, isTrackableListingId } from "../src/lib/contact-event-types"

test("contact event types are allow-listed", () => {
  assert.equal(isContactEventType("listing_view"), true)
  assert.equal(isContactEventType("whatsapp_click"), true)
  assert.equal(isContactEventType("phone_click"), true)
  assert.equal(isContactEventType("message_start"), true)
  assert.equal(isContactEventType("phone_number"), false)
})

test("contact analytics only accepts real board listing ids", () => {
  assert.equal(isTrackableListingId("ad-1234"), true)
  assert.equal(isTrackableListingId("preview"), false)
  assert.equal(isTrackableListingId("hilux-nairobi"), false)
})
