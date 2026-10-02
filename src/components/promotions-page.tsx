"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { usePrefs } from "@/components/prefs-provider"
import { PaymentSupportSettings } from "@/components/payment-support-settings"
import { SellerContactLeads } from "@/components/seller-contact-leads"
import { refreshBoard, useMarketplace } from "@/lib/marketplace"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { requestTermsReaccept } from "@/lib/terms-client"
import { featuredPackage, promotionStatuses, type Promotion } from "@/lib/promotions"

const decisionKeys = {
  approve: "promotion.action.approve", reject: "promotion.action.reject",
  remove: "promotion.action.remove", grant: "promotion.action.grant",
} as const
const notificationKeys = {
  payment_received: "promotion.notice.payment_received", approved: "promotion.notice.approved",
  rejected: "promotion.notice.rejected", removed: "promotion.notice.removed", granted: "promotion.notice.granted",
  refunded: "promotion.notice.refunded", refund_failed: "promotion.notice.refund_failed", review_overdue: "promotion.notice.review_overdue",
} as const

export function PromotionsPage({ admin = false }: { admin?: boolean }) {
  const { listings } = useMarketplace()
  const { t, language } = usePrefs()
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
  const [days, setDays] = useState<number>(featuredPackage.days)
  const [filter, setFilter] = useState(admin ? "pending" : "all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const requestVersion = useRef({ value: 0 })
  const endpoint = admin ? "/api/admin/promotions" : "/api/promotions"
  const load = useCallback(async () => {
    const version = ++requestVersion.current.value
    const response = await fetch(`${endpoint}?page=${page}&status=${encodeURIComponent(filter)}`, { cache: "no-store" })
    const payload = await response.json()
    if (version !== requestVersion.current.value) return
    if (response.status === 428) requestTermsReaccept()
    if (!response.ok) throw new Error(payload.reason ?? t("promotion.loadError"))
    setNow(Date.now())
    setRows(payload.promotions)
    setTotal(payload.total)
    setCheckoutAvailable(payload.checkoutAvailable === true)
  }, [endpoint, page, filter, t])
  useEffect(() => {
    const requests = requestVersion.current
    let cancelled = false
    void Promise.resolve().then(async () => {
      if (cancelled) return
      setLoading(true)
      setError("")
      const id = new URLSearchParams(window.location.search).get("listing")
      if (id) setListingId(id)
      await load()
    }).catch(e => { if (!cancelled) setError(e.message) }).finally(() => { if (!cancelled) setLoading(false) })
    const onFocus = () => { void load().catch(() => {}) }
    window.addEventListener("focus", onFocus)
    const timer = setInterval(() => { void load().catch(() => {}) }, 15000)
    return () => { cancelled = true; requests.value++; clearInterval(timer); window.removeEventListener("focus", onFocus) }
  }, [load])

  async function checkout() {
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/promotions/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId, acceptTerms: accepted, language }) })
      const payload = await response.json()
      if (response.status === 428) requestTermsReaccept()
      if (!response.ok) throw new Error(payload.reason ?? t("promotion.checkoutError"))
      window.location.assign(payload.url)
    } catch (e) { setError(e instanceof Error ? e.message : t("promotion.checkoutError")) }
    finally { setBusy(false) }
  }

  async function act(action: string, id?: string) {
    setBusy(true); setError(""); setNotice("")
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id, reason, listingId, days }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.reason ?? t("promotion.updateError"))
      await load(); await refreshBoard({ force: true }); setNotice(t("promotion.updated")); setReason("")
    } catch (e) { setError(e instanceof Error ? e.message : t("promotion.updateError")); await load().catch(() => {}) }
    finally { setBusy(false) }
  }

  const money = (amount: number, currency: string = featuredPackage.currency) => new Intl.NumberFormat(language, { style: "currency", currency: currency.toUpperCase(), currencyDisplay: "code" }).format(amount / 100)
  const date = (value: string) => new Date(value).toLocaleString(language)
  const eligible = listings.filter(item => item.mine && isPubliclyVisibleListing(item, now) && Date.parse(item.expiresAt ?? "") > now + featuredPackage.days * 86400000)
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(admin ? "promotion.adminTitle" : "promotion.sellerTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("promotion.package", { price: money(featuredPackage.amount), days: featuredPackage.days })}</p>
      </div>
      <p className="text-sm text-muted-foreground">{t("promotion.placementTerms")}</p>
      <p className="text-sm text-muted-foreground">{t("promotion.durationTerms", { days: featuredPackage.days })}</p>
      <p className="text-sm text-muted-foreground">{t("promotion.reviewTerms", { hours: featuredPackage.reviewHours })}</p>
      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-foreground">{notice}</p> : null}
      {admin ? <PaymentSupportSettings /> : null}
      {admin ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold">{t("promotion.decisionReason")}</h2>
          <label className="block text-sm">{t("promotion.reasonLabel")}
            <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1500} className="mt-1 block w-full rounded-md border border-input bg-background p-2" />
          </label>
          <h2 className="font-semibold">{t("promotion.grantTitle")}</h2>
          <label className="block text-sm">{t("promotion.listingId")} <input value={listingId} onChange={e => setListingId(e.target.value)} placeholder="ad-…" className="ml-2 rounded-md border border-input bg-background p-2" /></label>
          <label className="block text-sm">{t("promotion.days")} <input type="number" min={1} max={featuredPackage.maxGrantDays} value={days} onChange={e => setDays(Number(e.target.value))} className="ml-2 w-20 rounded-md border border-input bg-background p-2" /></label>
          <Button disabled={busy || reason.trim().length < 3 || !listingId} onClick={() => void act("grant")}>{t("promotion.grant")}</Button>
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <label className="block text-sm">{t("promotion.chooseAd")}
            <select value={listingId} onChange={e => setListingId(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background p-2">
              <option value="">{t("promotion.chooseActive")}</option>
              {eligible.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" />{t("promotion.acceptTerms")}</label>
          <p className="text-xs text-muted-foreground">{t("promotion.chargeCurrency")}</p>
          {language === "sw" ? <p className="text-xs text-muted-foreground">{t("promotion.stripeFallback")}</p> : null}
          <Button disabled={busy || !listingId || !accepted || !checkoutAvailable} onClick={() => void checkout()}>{busy ? t("promotion.openingCheckout") : t("promotion.pay", { price: money(featuredPackage.amount) })}</Button>
          {!loading && !checkoutAvailable ? <p className="text-sm text-muted-foreground">{t("promotion.unavailable")}</p> : null}
          {!eligible.length ? <p className="text-sm text-muted-foreground">{t("promotion.eligibleHint", { days: featuredPackage.days })}</p> : null}
          <div className="flex flex-wrap gap-4 text-sm underline"><Link href="/my-ads">{t("promotion.back")}</Link><Link href="/contact">{t("promotion.support")}</Link></div>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">{t(admin ? "promotion.queue" : "promotion.statsTitle")}</h2>
        <label className="block text-sm">{t("promotion.status")} <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} className="ml-2 rounded-md border border-input bg-background p-2"><option value="all">{t("promotion.all")}</option>{promotionStatuses.map(status => <option key={status} value={status}>{t(`promotion.status.${status}`)}</option>)}</select></label>
        <p className="text-xs text-muted-foreground">{t("promotion.statsHint", { days: featuredPackage.retentionDays })}</p>
        {loading ? <p>{t("promotion.loading")}</p> : !rows.length ? <p className="text-sm text-muted-foreground">{t("promotion.empty")}</p> : rows.map(row => (
          <article key={row.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <Link href={`/listings/${encodeURIComponent(row.listing_id)}`} className="font-medium underline">{listings.find(item => item.id === row.listing_id)?.title ?? row.listing_id}</Link>
            <p className="text-sm">{t(`promotion.status.${row.status}`)} · {row.paid ? money(row.amount, row.currency) : t(row.amount === 0 ? "promotion.complimentary" : "promotion.unpaid")}</p>
            {row.ends_at ? <p className="text-sm">{t(Date.parse(row.ends_at) <= now ? "promotion.ended" : "promotion.ends", { date: date(row.ends_at) })}</p> : null}
            {row.status === "pending" && row.review_due_at ? <p className="text-sm">{t("promotion.reviewDue", { date: date(row.review_due_at) })}</p> : null}
            {row.status === "pending" && (row.review_overdue || (row.review_due_at && Date.parse(row.review_due_at) < now)) ? <p role="status" className="text-sm font-medium text-destructive">{t("promotion.reviewOverdue")}</p> : null}
            {admin && row.refund_last_error ? <p role="alert" className="text-sm text-destructive">{t("promotion.refundError", { reason: row.refund_last_error })}</p> : null}
            {admin && row.refund_next_attempt_at ? <p className="text-sm">{t("promotion.refundRetry", { date: date(row.refund_next_attempt_at) })}</p> : null}
            {row.decisions?.length ? <ul className="space-y-1 text-sm text-muted-foreground">{row.decisions.map((decision, index) => <li key={index}>{decision.action in decisionKeys ? t(decisionKeys[decision.action as keyof typeof decisionKeys]) : t("promotion.decisionReason")}: {decision.reason} · {date(decision.created_at)}</li>)}</ul> : row.decision_reason ? <p className="text-sm text-muted-foreground">{t("promotion.decision", { reason: row.decision_reason })}</p> : null}
            <p className="text-sm">{t("promotion.stats", { impressions: (row.impressions ?? 0).toLocaleString(language), clicks: (row.clicks ?? 0).toLocaleString(language) })}</p>
            {row.notifications?.length ? <ul className="space-y-1 text-xs text-muted-foreground">{row.notifications.filter(item => item.kind in notificationKeys).map((item, index) => <li key={index}>{t("promotion.notification", { kind: t(notificationKeys[item.kind as keyof typeof notificationKeys]) })} · {item.status === "sent" && item.delivered_at ? t("promotion.notificationSent", { date: date(item.delivered_at) }) : admin && item.status === "failed" ? t("promotion.notificationFailed") : t("promotion.notificationPending")}</li>)}</ul> : null}
            {admin ? <div className="flex flex-wrap gap-2">
              {row.status === "pending" ? <><Button disabled={busy || reason.trim().length < 3} onClick={() => void act("approve", row.id)}>{t("promotion.approve", { days: row.duration_days })}</Button><Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => void act("reject", row.id)}>{t("promotion.reject")}</Button></> : null}
              {row.status === "active" ? <Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => void act("remove", row.id)}>{t(row.paid ? "promotion.removeRefund" : "promotion.remove")}</Button> : null}
              {row.status === "refund_pending" ? <Button variant="outline" disabled={busy} onClick={() => void act("retry_refund", row.id)}>{t("promotion.retryRefund")}</Button> : null}
            </div> : null}
          </article>
        ))}
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={busy || loading || page === 0} onClick={() => setPage(page - 1)}>{t("promotion.previous")}</Button>
          <span className="text-sm">{t("promotion.page", { page: (page + 1).toLocaleString(language), total: total.toLocaleString(language) })}</span>
          <Button variant="outline" disabled={busy || loading || (page + 1) * 50 >= total} onClick={() => setPage(page + 1)}>{t("promotion.next")}</Button>
        </div>
      </section>
      {!admin ? <SellerContactLeads listingIds={rows.map(row => row.listing_id)} /> : null}
    </div>
  )
}
