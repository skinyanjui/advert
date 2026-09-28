"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { Button } from "@/components/ui/button"
import { reportReasonLabel, reportReasons, type ReportReasonId } from "@/lib/reports"

type AdminReport = {
  id: string
  listingId: string
  listingTitle: string
  reason: ReportReasonId
  note: string | null
  createdAt: string
  listingHidden: boolean
}

type AdminAction = "dismiss" | "hide" | "remove" | "mark_sponsored"

export function AdminReportsClient({
  initialReports,
  loadError,
}: {
  initialReports: AdminReport[]
  loadError: boolean
}) {
  const [reports, setReports] = useState(initialReports)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reasonFilter, setReasonFilter] = useState<"" | ReportReasonId>("")

  const visible = useMemo(
    () => (reasonFilter ? reports.filter((report) => report.reason === reasonFilter) : reports),
    [reasonFilter, reports],
  )

  async function act(reportId: string, action: AdminAction) {
    setBusyId(reportId)
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      })
      const payload = (await response.json()) as { reason?: string; reports?: AdminReport[] }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not update that report.")
        return
      }
      setReports(Array.isArray(payload.reports) ? payload.reports : [])
      const label =
        action === "dismiss"
          ? "Report dismissed"
          : action === "hide"
            ? "Ad hidden"
            : action === "remove"
              ? "Ad removed"
              : "Marked sponsored"
      toast.success(label)
    } catch {
      toast.error("Could not update that report.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pending listing reports. Dismiss clears a report; hide or remove acts on the ad.
      </p>
      <div className="mt-4">
        <label className="text-xs font-medium text-neutral-600" htmlFor="report-reason-filter">
          Filter by reason
        </label>
        <select
          id="report-reason-filter"
          className="mt-1 flex h-10 w-full max-w-sm rounded-md border border-neutral-200 bg-white px-3 text-sm"
          value={reasonFilter}
          onChange={(event) => setReasonFilter(event.target.value as "" | ReportReasonId)}
        >
          <option value="">All reasons</option>
          {reportReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.label}
            </option>
          ))}
        </select>
      </div>
      {loadError ? (
        <p className="mt-4 text-sm text-rose-600">Could not load reports. Refresh and try again.</p>
      ) : null}
      {visible.length === 0 && !loadError ? (
        <EmptyPanel
          title={reasonFilter ? "No reports for this reason" : "No pending reports"}
          body={
            reasonFilter
              ? "Try another reason filter, or clear the filter."
              : "New reports from listing pages appear here."
          }
        />
      ) : (
        <ul className="mt-6 grid gap-3">
          {visible.map((report) => (
            <li key={report.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/listings/${report.listingId}`}
                    className="font-medium text-neutral-950 hover:underline"
                  >
                    {report.listingTitle}
                  </Link>
                  <p className="mt-1 text-sm text-neutral-600">{reportReasonLabel(report.reason)}</p>
                  {report.note ? <p className="mt-1 text-sm text-neutral-500">{report.note}</p> : null}
                  <p className="mt-2 text-xs text-neutral-400">
                    {new Date(report.createdAt).toLocaleString()}
                    {report.listingHidden ? " · currently hidden" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={busyId === report.id}
                    onClick={() => void act(report.id, "dismiss")}
                  >
                    Dismiss
                  </Button>
                  {report.reason === "undisclosed_promo" ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={busyId === report.id}
                      onClick={() => void act(report.id, "mark_sponsored")}
                    >
                      Mark sponsored
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={busyId === report.id}
                    onClick={() => void act(report.id, "hide")}
                  >
                    Hide ad
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    disabled={busyId === report.id}
                    onClick={() => void act(report.id, "remove")}
                  >
                    Remove ad
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
