"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { refreshBoard, useMarketplace } from "@/lib/marketplace"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { requestTermsReaccept } from "@/lib/terms-client"
import { featuredPackage, type Promotion } from "@/lib/promotions"

const statusLabels: Record<Promotion["status"], string> = {
  awaiting_payment: "Awaiting payment", pending: "Paid · awaiting admin review", active: "Featured",
  refund_pending: "Refund pending", refunded: "Refunded", revoked: "Removed", expired: "Expired", cancelled: "Checkout expired",
}

export function PromotionsPage({ admin = false }: { admin?: boolean }) {
  const { listings } = useMarketplace()
  const [now, setNow] = useState(() => Date.now())
  const [rows, setRows] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [checkoutAvailable, setCheckoutAvailable] = useState(false)
  const [listingId, setListingId] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [reason, setReason] = useState("")
  const [days, setDays] = useState(7)
  const [filter, setFilter] = useState(admin ? "pending" : "all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const endpoint = admin ? "/api/admin/promotions" : "/api/promotions"
  const load = useCallback(async () => {
    const response = await fetch(`${endpoint}?page=${page}&status=${encodeURIComponent(filter)}`, { cache: "no-store" })
    const payload = await response.json()
    if (response.status === 428) requestTermsReaccept()
    if (!response.ok) throw new Error(payload.reason ?? "Could not load promotions.")
    setNow(Date.now())
    setRows(payload.promotions)
    setTotal(payload.total)
    setCheckoutAvailable(payload.checkoutAvailable === true)
  }, [endpoint, page, filter])
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(async () => {
      const id = new URLSearchParams(window.location.search).get("listing")
      if (id && !cancelled) setListingId(id)
      await load()
    }).catch(e => { if (!cancelled) setError(e.message) }).finally(() => { if (!cancelled) setLoading(false) })
    const onFocus = () => { void load().catch(() => {}) }
    window.addEventListener("focus", onFocus)
    const timer = setInterval(() => { void load().catch(() => {}) }, 15000)
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("focus", onFocus) }
  }, [load])

  async function checkout() {
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/promotions/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId, acceptTerms: accepted }) })
      const payload = await response.json()
      if (response.status === 428) requestTermsReaccept()
      if (!response.ok) throw new Error(payload.reason ?? "Could not create checkout.")
      window.location.assign(payload.url)
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed.") }
    finally { setBusy(false) }
  }

  async function act(action: string, id?: string) {
    setBusy(true); setError(""); setNotice("")
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id, reason, listingId, days }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.reason ?? "Could not update promotion.")
      await load(); await refreshBoard({ force: true }); setNotice("Promotion updated."); setReason("")
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); await load().catch(() => {}) }
    finally { setBusy(false) }
  }

  const eligible = listings.filter(item => item.mine && isPubliclyVisibleListing(item, now) && Date.parse(item.expiresAt ?? "") > now + featuredPackage.days * 86400000)
  const visible = rows
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold">{admin ? "Featured promotion review" : "Feature an ad"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">USD {(featuredPackage.amount / 100).toFixed(2)} for {featuredPackage.days} days. Pay through Stripe, then an admin reviews your ad. The seven days start on approval. Rejected requests receive a full refund; bank processing time may vary.</p>
      </div>
      <p className="text-sm text-muted-foreground">Featured ads get priority among matching results under the default relevance sort. Country, city, category and search filters still apply. Price and newest sorts keep their order. Paid placements are marked “Ad · Featured”. No clicks, sales or specific position are guaranteed.</p>
      <p className="text-sm text-muted-foreground">The listing must remain active with at least seven days before expiry. Paused, sold, hidden or expired ads stop receiving priority; the promotion clock continues. If an admin removes a paid promotion, a full refund is issued.</p>
      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-foreground">{notice}</p> : null}
      {admin ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold">Decision reason</h2>
          <label className="block text-sm">Reason shared with the seller
            <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1500} className="mt-1 block w-full rounded-md border border-input bg-background p-2" />
          </label>
          <h2 className="font-semibold">Complimentary grant</h2>
          <label className="block text-sm">Listing ID <input value={listingId} onChange={e => setListingId(e.target.value)} placeholder="ad-…" className="ml-2 rounded-md border border-input bg-background p-2" /></label>
          <label className="block text-sm">Days <input type="number" min={1} max={featuredPackage.maxGrantDays} value={days} onChange={e => setDays(Number(e.target.value))} className="ml-2 w-20 rounded-md border border-input bg-background p-2" /></label>
          <Button disabled={busy || reason.trim().length < 3 || !listingId} onClick={() => void act("grant")}>Grant at no charge</Button>
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <label className="block text-sm">Choose your ad
            <select value={listingId} onChange={e => setListingId(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background p-2">
              <option value="">Choose an active ad</option>
              {eligible.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" />I accept the price, review, placement, duration and refund terms above.</label>
          <Button disabled={busy || !listingId || !accepted || !checkoutAvailable} onClick={() => void checkout()}>{busy ? "Opening checkout…" : "Pay USD 10 with Stripe"}</Button>
          {!loading && !checkoutAvailable ? <p className="text-sm text-muted-foreground">Paid featuring is not available yet.</p> : null}
          {!eligible.length ? <p className="text-sm text-muted-foreground">Post or renew an active ad with at least seven days remaining.</p> : null}
          <Link href="/my-ads" className="block text-sm underline">Back to My ads</Link>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">{admin ? "Queue and history" : "Your promotions and stats"}</h2>
        <label className="block text-sm">Status <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} className="ml-2 rounded-md border border-input bg-background p-2"><option value="all">All</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p className="text-xs text-muted-foreground">Approximate first-party stats for the last 90 days: one visible-card impression and one listing-card click per board session/account per promotion per day. Seller activity is excluded. These are not audited billing metrics.</p>
        {loading ? <p>Loading…</p> : !visible.length ? <p className="text-sm text-muted-foreground">No promotions in this view.</p> : visible.map(row => (
          <article key={row.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <Link href={`/listings/${encodeURIComponent(row.listing_id)}`} className="font-medium underline">{listings.find(item => item.id === row.listing_id)?.title ?? row.listing_id}</Link>
            <p className="text-sm">{statusLabels[row.status]} · {row.paid ? `USD ${(row.amount / 100).toFixed(2)}` : row.amount === 0 ? "Complimentary" : "Unpaid"}</p>
            {row.ends_at ? <p className="text-sm">{Date.parse(row.ends_at) <= now ? "Ended" : "Ends"} {new Date(row.ends_at).toLocaleString()}</p> : null}
            {row.decisions?.length ? <ul className="space-y-1 text-sm text-muted-foreground">{row.decisions.map((decision, index) => <li key={index}>{decision.action}: {decision.reason} · {new Date(decision.created_at).toLocaleString()}</li>)}</ul> : row.decision_reason ? <p className="text-sm text-muted-foreground">Decision: {row.decision_reason}</p> : null}
            <p className="text-sm">{row.impressions ?? 0} impressions · {row.clicks ?? 0} clicks</p>
            {admin ? <div className="flex flex-wrap gap-2">
              {row.status === "pending" ? <><Button disabled={busy || reason.trim().length < 3} onClick={() => void act("approve", row.id)}>Approve seven days</Button><Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => void act("reject", row.id)}>Reject and refund</Button></> : null}
              {row.status === "active" ? <Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => void act("remove", row.id)}>Remove{row.paid ? " and refund" : ""}</Button> : null}
              {row.status === "refund_pending" ? <Button variant="outline" disabled={busy} onClick={() => void act("retry_refund", row.id)}>Retry refund</Button> : null}
            </div> : null}
          </article>
        ))}
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={busy || page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm">Page {page + 1} · {total} promotions</span>
          <Button variant="outline" disabled={busy || (page + 1) * 50 >= total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </section>
    </div>
  )
}
