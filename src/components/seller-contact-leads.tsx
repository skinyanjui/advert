"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { contactAnalyticsPolicy, type ContactLeadStats } from "@/lib/contact-leads"
import { sellerLeadsCopy } from "@/lib/i18n/seller-leads"

export function SellerContactLeads({ listingIds }: { listingIds?: string[] }) {
  const { language } = usePrefs()
  const { user } = useAuth()
  const copy = sellerLeadsCopy[language]
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<{ key: string; rows: ContactLeadStats[]; hasMore: boolean; failed?: boolean } | null>(null)
  const ids = listingIds ? [...new Set(listingIds)].sort().join(",") : "all"
  const requestKey = `${user?.id ?? ""}:${ids}:${page}`

  useEffect(() => {
    if (!user?.id) return
    const controller = new AbortController()
    if (ids === "") return
    const query = new URLSearchParams({ page: String(page) })
    if (ids !== "all") ids.split(",").forEach(id => query.append("listingId", id))
    void fetch(`/api/contact-leads?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || !body.ok) throw new Error("Contact lead request failed")
        if (!controller.signal.aborted) setResult({ key: requestKey, rows: body.rows, hasMore: body.hasMore })
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key: requestKey, rows: [], hasMore: false, failed: true })
      })
    return () => controller.abort()
  }, [ids, page, requestKey, user?.id])

  if (!user?.id || ids === "") return null
  const current = result?.key === requestKey ? result : null
  const columns = ["views", "contacts", "whatsapp", "calls", "texts", "messages"] as const
  const number = new Intl.NumberFormat(language)
  return (
    <section className="my-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">{copy.title}</h2>
      <p className="text-xs text-muted-foreground">{copy.explanation.replace("{days}", String(contactAnalyticsPolicy.retentionDays))}</p>
      {!current ? <p role="status" className="text-sm">{copy.loading}</p> : current.failed ? <p role="status" className="text-sm text-muted-foreground">{copy.error}</p> : !current.rows.length ? <p className="text-sm text-muted-foreground">{copy.empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{copy.title}</caption>
            <thead><tr><th scope="col" className="min-w-40 py-2 pr-4">{copy.listing}</th>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 text-right">{copy[column]}</th>)}</tr></thead>
            <tbody>{current.rows.map(row => <tr key={row.listing_id} className="border-t border-border"><th scope="row" className="py-3 pr-4 font-normal"><Link href={`/listings/${encodeURIComponent(row.listing_id)}`} className="underline underline-offset-2">{row.listing_title}</Link></th>{columns.map(column => <td key={column} className="px-3 py-3 text-right tabular-nums">{number.format(row[column])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {page > 0 || current?.hasMore ? <div className="flex items-center gap-3"><Button variant="outline" disabled={!current || page === 0} onClick={() => setPage(value => value - 1)}>{copy.previous}</Button><span className="text-sm">{copy.page} {number.format(page + 1)}</span><Button variant="outline" disabled={!current?.hasMore} onClick={() => setPage(value => value + 1)}>{copy.next}</Button></div> : null}
    </section>
  )
}
