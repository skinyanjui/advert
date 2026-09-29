import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { listingContactCapabilities } from "../src/lib/listing-contact"

test("listing contact capabilities keep Messenger separate from direct contact", () => {
  const guest = listingContactCapabilities({
    status: "active",
    mine: false,
    signedIn: false,
    sample: false,
    hasPhone: true,
    whatsappEnabled: true,
    phoneEnabled: true,
  })
  assert.equal(guest.message, true)
  assert.equal(guest.whatsapp, false)
  assert.equal(guest.text, false)
  assert.equal(guest.call, false)

  const member = listingContactCapabilities({
    status: "active",
    mine: false,
    signedIn: true,
    sample: false,
    hasPhone: true,
    whatsappEnabled: true,
    phoneEnabled: true,
  })
  assert.deepEqual(member, {
    message: true,
    whatsapp: true,
    text: true,
    call: true,
    closedStatus: null,
  })

  const sample = listingContactCapabilities({
    status: "active",
    mine: false,
    signedIn: true,
    sample: true,
    hasPhone: true,
    whatsappEnabled: true,
    phoneEnabled: true,
  })
  assert.equal(sample.message, true)
  assert.equal(sample.whatsapp, false)
  assert.equal(sample.text, false)
  assert.equal(sample.call, false)
})

test("inactive contact state is identical across desktop and mobile", () => {
  const paused = listingContactCapabilities({
    status: "paused",
    mine: false,
    signedIn: true,
    sample: false,
    hasPhone: true,
    whatsappEnabled: true,
    phoneEnabled: true,
  })
  assert.deepEqual(paused, {
    message: false,
    whatsapp: false,
    text: false,
    call: false,
    closedStatus: "paused",
  })

  const owner = listingContactCapabilities({
    status: "paused",
    mine: true,
    signedIn: true,
    sample: false,
    hasPhone: true,
    whatsappEnabled: true,
    phoneEnabled: true,
  })
  assert.equal(owner.closedStatus, null)

  const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")
  assert.match(detail, /contact\.closedStatus === "paused"/)
  assert.match(detail, /t\("listing\.paused"\)/)
  assert.doesNotMatch(detail, /expired \? t\("listing\.expired"\) : t\("listing\.sold"\)/)
})

test("listing detail reuses shared localized dialog and accessibility copy", () => {
  const detail = readFileSync(new URL("../src/components/listing-detail.tsx", import.meta.url), "utf8")
  assert.match(detail, /t\("myAds\.removeTitle"\)/)
  assert.match(detail, /t\("myAds\.removeBody"/)
  assert.match(detail, /t\("report\.reasonLabel"\)/)
  assert.match(detail, /t\("report\.notePlaceholder"\)/)
  assert.match(detail, /ariaLabel=\{t\("listing\.whatsapp"\)\}/)
  assert.match(detail, /aria-label=\{t\("listing\.callPhone"/)
})
