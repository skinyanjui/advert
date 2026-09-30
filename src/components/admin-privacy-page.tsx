"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  privacyJurisdictionLabel,
  privacyRequestTypeLabel,
  privacyStatusLabel,
  type PrivacyRequestStatus,
} from "@/lib/privacy-rights"
import type { PrivacyRequestRecord } from "@/lib/privacy-requests"

type Action = "verify" | "start" | "complete" | "deny"

export function AdminPrivacyPage({
  initialRequests,
  loadError,
  now,
}: {
  initialRequests: PrivacyRequestRecord[]
  loadError: boolean
  now: string
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [status, setStatus] = useState<"" | PrivacyRequestStatus>("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const visible = useMemo(
    () => (status ? requests.filter((request) => request.status === status) : requests),
    [requests, status],
  )

  async function act(requestId: string, action: Action) {
    setBusyId(requestId)
    try {
      const response = await fetch("/api/admin/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          resolution: notes[requestId]?.trim() || null,
        }),
      })
      const payload = (await response.json()) as {
        reason?: string
        requests?: PrivacyRequestRecord[]
      }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not update the privacy request.")
        return
      }
      setRequests(Array.isArray(payload.requests) ? payload.requests : [])
      setNotes((current) => ({ ...current, [requestId]: "" }))
      toast.success("Privacy request updated")
    } catch {
      toast.error("Could not update the privacy request.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privacy requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Verify identity when needed, work the request, and record a concise resolution. The due date is an internal target; applicable legal deadlines may differ.
          </p>
        </div>
        <label className="grid gap-1 text-xs font-medium text-neutral-600">
          Status
          <select
            className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | PrivacyRequestStatus)}
          >
            <option value="">All</option>
            <option value="verification_required">Verification required</option>
            <option value="received">Received</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="denied">Denied</option>
            <option value="appealed">Appealed</option>
          </select>
        </label>
      </div>

      {loadError ? <p className="mt-5 text-sm text-rose-600">Could not load privacy requests.</p> : null}

      <ul className="mt-6 grid gap-3">
        {visible.map((request) => {
          const overdue =
            !["completed", "denied"].includes(request.status) &&
            new Date(request.dueAt).getTime() < new Date(now).getTime()
          return (
            <li key={request.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-neutral-950">
                      {privacyRequestTypeLabel(request.requestType)}
                    </p>
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">
                      {privacyStatusLabel(request.status)}
                    </span>
                    {overdue ? (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">
                        Internal target passed
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {privacyJurisdictionLabel(request.jurisdiction)} · {request.requestEmail}
                  </p>
                  {request.actingAsAgent ? (
                    <p className="mt-1 text-sm text-neutral-600">
                      Authorized-agent request for {request.subjectEmail ?? "another person"}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-neutral-400">
                    Received {new Date(request.receivedAt).toLocaleString()} · Internal target {new Date(request.dueAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Verification: {request.verificationMethod ?? "not verified"}
                    {request.acknowledgmentSentAt
                      ? ` · acknowledgment sent ${new Date(request.acknowledgmentSentAt).toLocaleString()}`
                      : " · no acknowledgment email recorded"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Verification: {request.verificationMethod ?? (request.status === "verification_required" ? "required" : "not recorded")}
                    {" · "}
                    Acknowledgment: {request.acknowledgmentSentAt ? new Date(request.acknowledgmentSentAt).toLocaleString() : "not sent / email provider unavailable"}
                  </p>
                  <p className="mt-1 break-all text-xs text-neutral-400">ID {request.id}</p>
                </div>
              </div>

              {request.details ? (
                <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                  {request.details}
                </div>
              ) : null}

              {request.resolution ? (
                <p className="mt-3 text-sm text-neutral-600">
                  <span className="font-medium text-neutral-800">Current resolution:</span> {request.resolution}
                </p>
              ) : null}

              <div className="mt-4 grid gap-2">
                <label className="text-xs font-medium text-neutral-600" htmlFor={`resolution-${request.id}`}>
                  Internal / customer-facing resolution note
                </label>
                <Textarea
                  id={`resolution-${request.id}`}
                  value={notes[request.id] ?? ""}
                  maxLength={2500}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [request.id]: event.target.value }))
                  }
                  placeholder="Record what was verified, completed, denied, or communicated. Do not paste identity documents."
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {request.status === "verification_required" ? (
                  <Button variant="outline" disabled={busyId === request.id} onClick={() => void act(request.id, "verify")}>
                    Mark verified
                  </Button>
                ) : null}
                {!["completed", "denied"].includes(request.status) ? (
                  <Button variant="outline" disabled={busyId === request.id} onClick={() => void act(request.id, "start")}>
                    Start review
                  </Button>
                ) : null}
                {!["completed", "denied"].includes(request.status) ? (
                  <>
                    <Button
                      disabled={busyId === request.id || !(notes[request.id]?.trim())}
                      onClick={() => void act(request.id, "complete")}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busyId === request.id || !(notes[request.id]?.trim())}
                      onClick={() => void act(request.id, "deny")}
                    >
                      Deny
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {!loadError && visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No privacy requests match this status.
        </p>
      ) : null}
    </div>
  )
}
