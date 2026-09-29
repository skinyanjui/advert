import { NextResponse } from "next/server"

import { canOwner } from "@/lib/access-control"
import { boardDb } from "@/lib/board-db"
import { resolveOwner, sameOrigin } from "@/lib/board-session"
import { cleanListing } from "@/lib/board-payload"
import { isPubliclyVisibleListing, isListingStatus } from "@/lib/listing-status"
import {
  WHATSAPP_CONSENT_SCOPE,
  WHATSAPP_CONSENT_VERSION,
  whatsappConsentStatement,
} from "@/lib/whatsapp-consent"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ListingRow = {
  owner_id: string
  payload: unknown
  status?: string | null
  hidden_at?: string | null
  expires_at?: string | null
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "Invalid request." }, { status: 403 })

  const response = NextResponse.json({ ok: true })
  const actor = await resolveOwner(request)
  if (!canOwner(actor, "contact:direct")) {
    return NextResponse.json({ ok: false, reason: "Sign in to use direct contact." }, { status: 401 })
  }

  let body: { listingId?: unknown }
  try {
    body = (await request.json()) as { listingId?: unknown }
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid request." }, { status: 400 })
  }

  if (typeof body.listingId !== "string" || !/^ad-[a-zA-Z0-9-]{1,64}$/.test(body.listingId)) {
    return NextResponse.json({ ok: false, reason: "Invalid listing." }, { status: 400 })
  }

  const db = boardDb()
  const { data, error } = await db
    .from("board_listings")
    .select("owner_id,payload,status,hidden_at,expires_at")
    .eq("id", body.listingId)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ ok: false, reason: "Listing unavailable." }, { status: 404 })

  const row = data as ListingRow
  const listing = cleanListing(row.payload)
  if (!listing) return NextResponse.json({ ok: false, reason: "Listing unavailable." }, { status: 404 })
  if (row.owner_id === actor.id) return NextResponse.json({ ok: false, reason: "You cannot consent to your own listing." }, { status: 400 })
  if (listing.contactWhatsApp === false || !listing.phone.trim()) {
    return NextResponse.json({ ok: false, reason: "WhatsApp contact is unavailable." }, { status: 409 })
  }

  const status = isListingStatus(row.status) ? row.status : listing.status
  if (!isPubliclyVisibleListing({
    status,
    sold: listing.sold,
    hidden: Boolean(row.hidden_at) || listing.hidden,
    expiresAt: row.expires_at ?? listing.expiresAt,
  })) {
    return NextResponse.json({ ok: false, reason: "WhatsApp contact is unavailable." }, { status: 409 })
  }

  const statement = whatsappConsentStatement(listing.sellerName, listing.title)
  const { error: insertError } = await db.from("board_whatsapp_consents").insert({
    id: crypto.randomUUID(),
    listing_id: listing.id,
    seller_id: row.owner_id,
    buyer_id: actor.id,
    buyer_kind: actor.kind,
    seller_name_snapshot: listing.sellerName,
    listing_title_snapshot: listing.title,
    scope: WHATSAPP_CONSENT_SCOPE,
    consent_version: WHATSAPP_CONSENT_VERSION,
    consent_statement: statement,
  })

  if (insertError) {
    console.error("Could not record WhatsApp consent", insertError.message)
    return NextResponse.json({ ok: false, reason: "Could not record consent." }, { status: 500 })
  }

  return response
}
