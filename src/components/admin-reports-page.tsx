"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { reportReasonLabel, type ReportReasonId } from "@/lib/reports"

type AdminReport = {
  id: string
  listingId: string
  listingTitle: string
  reason: ReportReasonId
  note: string | null
  createdAt: string
  listingHidden: boolean
}

export function AdminReportsClient({
  initialReports,
  loadError,
}: {
  initialReports: AdminReport[]
  loadError: boolean
}) {
  const [reports, setReports] = useState(initialReports)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function act(reportId: string, action: "dismiss" | "hide" | "remove") {
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
      toast.success(action === "dismiss" ? "Report dismissed" : action === "hide" ? "Ad hidden" : "Ad removed")
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
      {loadError ? (
        <p className="mt-4 text-sm text-rose-600">Could not load reports. Refresh and try again.</p>
      ) : null}
      {reports.length === 0 && !loadError ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold tracking-tight">No pending reports</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">New reports from listing pages appear here.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {reports.map((report) => (
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
