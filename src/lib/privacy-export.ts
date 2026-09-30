import "server-only"

import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"
import { getProfile } from "@/lib/profile-store"

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

type ConversationRow = {
  id: string
  listing_id: string
  listing_title: string
  listing_owner_id: string
  buyer_id: string
}

export async function exportPrivacyData(userId: string, email?: string | null) {
  const db = boardDb()

  const [
    profile,
    listings,
    saves,
    buyerThreads,
    sellerThreads,
    sentMessages,
    reports,
    contactEvents,
    whatsappConsents,
    termsAcceptances,
    privacyRequests,
  ] = await Promise.all([
    getProfile(userId, email),
    db
      .from("board_listings")
      .select("id,payload,status,posted_at,expires_at,sold_at,hidden_at")
      .eq("owner_id", userId)
      .order("posted_at", { ascending: false }),
    db
      .from("board_saves")
      .select("listing_id,created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("board_conversations")
      .select("id,listing_id,listing_title,listing_owner_id,buyer_id")
      .eq("buyer_id", userId),
    db
      .from("board_conversations")
      .select("id,listing_id,listing_title,listing_owner_id,buyer_id")
      .eq("listing_owner_id", userId),
    db
      .from("board_conversation_messages")
      .select("id,conversation_id,body,sent_at")
      .eq("sender_id", userId)
      .order("sent_at", { ascending: true }),
    db
      .from("board_reports")
      .select("id,listing_id,reason,note,status,created_at,reviewed_at")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("board_contact_events")
      .select("listing_id,event_type,created_at")
      .eq("actor_id", userId)
      .eq("actor_kind", "auth")
      .order("created_at", { ascending: false }),
    db
      .from("board_whatsapp_consents")
      .select("listing_id,seller_name_snapshot,listing_title_snapshot,scope,consent_version,consent_statement,consented_at")
      .eq("buyer_id", userId)
      .order("consented_at", { ascending: false }),
    db
      .from("terms_acceptances")
      .select("terms_version,privacy_version,age_attested,privacy_acknowledged,disclosure_version,locale,accepted_at,ip,user_agent,context")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false }),
    db
      .from("privacy_requests")
      .select("id,jurisdiction,request_type,status,received_at,due_at,verified_at,verification_method,acknowledgment_sent_at,completed_at,resolution")
      .eq("user_id", userId)
      .order("received_at", { ascending: false }),
  ])

  for (const result of [
    listings,
    saves,
    buyerThreads,
    sellerThreads,
    sentMessages,
    reports,
    contactEvents,
    whatsappConsents,
    termsAcceptances,
    privacyRequests,
  ]) {
    check(result.error)
  }

  const conversations = new Map<string, ConversationRow>()
  for (const row of [...(buyerThreads.data ?? []), ...(sellerThreads.data ?? [])] as ConversationRow[]) {
    conversations.set(row.id, row)
  }

  const messages = (sentMessages.data ?? []).map((row) => {
    const conversation = conversations.get(row.conversation_id as string)
    return {
      id: row.id,
      conversationId: row.conversation_id,
      listingId: conversation?.listing_id ?? null,
      listingTitle: conversation?.listing_title ?? null,
      role:
        conversation?.listing_owner_id === userId
          ? "seller"
          : conversation?.buyer_id === userId
            ? "buyer"
            : null,
      body: row.body,
      sentAt: row.sent_at,
    }
  })

  return {
    exportVersion: "1",
    generatedAt: new Date().toISOString(),
    account: profile,
    listings: (listings.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      postedAt: row.posted_at,
      expiresAt: row.expires_at,
      soldAt: row.sold_at,
      hiddenAt: row.hidden_at,
      listing: cleanListing(row.payload),
    })),
    savedListings: saves.data ?? [],
    conversations: [...conversations.values()].map((conversation) => ({
      id: conversation.id,
      listingId: conversation.listing_id,
      listingTitle: conversation.listing_title,
      role: conversation.listing_owner_id === userId ? "seller" : "buyer",
    })),
    messagesSent: messages,
    reportsSubmitted: reports.data ?? [],
    contactEvents: contactEvents.data ?? [],
    whatsappConsentsGiven: whatsappConsents.data ?? [],
    legalAcceptances: termsAcceptances.data ?? [],
    privacyRequests: privacyRequests.data ?? [],
    currentProcessingFacts: {
      sellsPersonalInformation: false,
      crossContextBehavioralAdvertising: false,
      thirdPartyAdvertisingPixels: false,
      marketingEmail: false,
      marketingRobotexts: false,
      significantDecisionAdmt: false,
    },
    serviceProvidersAndHandoffs: [
      "Supabase — authentication, database, and storage",
      "Vercel — hosting and delivery",
      "Resend — transactional email when configured",
      "WhatsApp / Meta — only when a user chooses an off-platform WhatsApp contact action or where the Business Platform is enabled",
    ],
    note:
      "This export contains account data and messages you sent. Other users' private account identifiers and message contents are not included.",
  }
}
