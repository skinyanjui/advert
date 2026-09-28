"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"
import { isMessageKey, type MessageKey } from "@/lib/i18n"
import { reportReasons, type ReportReasonId } from "@/lib/reports"

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

function reasonLabel(id: ReportReasonId, t: (key: MessageKey) => string, fallback: string): string {
  const key = `report.reason.${id}`
  return isMessageKey(key) ? t(key) : fallback
}

export function AdminReportsClient({
  initialReports,
  loadError,
}: {
  initialReports: AdminReport[]
  loadError: boolean
}) {
  const { t } = usePrefs()
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
        toast.error(payload.reason ?? t("admin.toast.updateError"))
        return
      }
      setReports(Array.isArray(payload.reports) ? payload.reports : [])
      const label =
        action === "dismiss"
          ? t("admin.toast.dismissed")
          : action === "hide"
            ? t("admin.toast.hidden")
            : action === "remove"
              ? t("admin.toast.removed")
              : t("admin.toast.sponsored")
      toast.success(label)
    } catch {
      toast.error(t("admin.toast.updateError"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.reportsTitle")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("admin.reportsBody")}</p>
      <div className="mt-4">
        <label className="text-xs font-medium text-neutral-600" htmlFor="report-reason-filter">
          {t("admin.filterReason")}
        </label>
        <select
          id="report-reason-filter"
          className="mt-1 flex h-10 w-full max-w-sm rounded-md border border-neutral-200 bg-white px-3 text-sm"
          value={reasonFilter}
          onChange={(event) => setReasonFilter(event.target.value as "" | ReportReasonId)}
        >
          <option value="">{t("admin.allReasons")}</option>
          {reportReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reasonLabel(reason.id, t, reason.label)}
            </option>
          ))}
        </select>
      </div>
      {loadError ? (
        <p className="mt-4 text-sm text-rose-600">{t("admin.loadError")}</p>
      ) : null}
      {visible.length === 0 && !loadError ? (
        <EmptyPanel
          title={reasonFilter ? t("admin.emptyFilterTitle") : t("admin.emptyTitle")}
          body={reasonFilter ? t("admin.emptyFilterBody") : t("admin.emptyBody")}
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
                  <p className="mt-1 text-sm text-neutral-600">
                    {reasonLabel(report.reason, t, report.reason)}
                  </p>
                  {report.note ? <p className="mt-1 text-sm text-neutral-500">{report.note}</p> : null}
                  <p className="mt-2 text-xs text-neutral-400">
                    {new Date(report.createdAt).toLocaleString()}
                    {report.listingHidden ? t("admin.currentlyHidden") : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={busyId === report.id}
                    onClick={() => void act(report.id, "dismiss")}
                  >
                    {t("admin.dismiss")}
                  </Button>
                  {report.reason === "undisclosed_promo" ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={busyId === report.id}
                      onClick={() => void act(report.id, "mark_sponsored")}
                    >
                      {t("admin.markSponsored")}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={busyId === report.id}
                    onClick={() => void act(report.id, "hide")}
                  >
                    {t("admin.hideAd")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    disabled={busyId === report.id}
                    onClick={() => void act(report.id, "remove")}
                  >
                    {t("admin.removeAd")}
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
