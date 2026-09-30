"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { AdminModerationAppeal } from "@/lib/moderation-redress"

export function AdminModerationAppealsPage({
  initialAppeals,
  loadError,
}: {
  initialAppeals: AdminModerationAppeal[]
  loadError: boolean
}) {
  const [appeals, setAppeals] = useState(initialAppeals)
  const [showClosed, setShowClosed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resolutions, setResolutions] = useState<Record<string, string>>({})

  const visible = useMemo(
    () => (showClosed ? appeals : appeals.filter((appeal) => appeal.status === "pending")),
    [appeals, showClosed],
  )

  async function decide(appealId: string, outcome: "uphold" | "reverse") {
    const resolution = resolutions[appealId]?.trim() ?? ""
    if (!resolution) {
      toast.error("Add a reasoned resolution before deciding the appeal.")
      return
    }
    setBusyId(appealId)
    try {
      const response = await fetch("/api/admin/moderation-appeals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appealId, outcome, resolution }),
      })
      const payload = (await response.json()) as {
        reason?: string
        appeals?: AdminModerationAppeal[]
      }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not review the appeal.")
        return
      }
      setAppeals(Array.isArray(payload.appeals) ? payload.appeals : [])
      setResolutions((current) => ({ ...current, [appealId]: "" }))
      toast.success(outcome === "reverse" ? "Decision reversed" : "Decision upheld")
    } catch {
      toast.error("Could not review the appeal.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moderation appeals</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
            Review appeals using the original decision, the seller&apos;s explanation, and the applicable marketplace rule. Decisions must be human-reviewed and reasoned.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(event) => setShowClosed(event.target.checked)}
          />
          Show decided appeals
        </label>
      </div>

      {loadError ? <p className="mt-5 text-sm text-rose-600">Could not load moderation appeals.</p> : null}

      <div className="mt-6 grid gap-4">
        {visible.map((appeal) => (
          <section key={appeal.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-950">{appeal.listingTitle ?? "Listing"}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {appeal.restrictionType === "content_removed" ? "Removed from public view" : "Visibility restricted"}
                  {" · "}
                  {new Date(appeal.decisionCreatedAt).toLocaleString()}
                </p>
                {appeal.listingId ? (
                  <Link
                    href={`/listings/${appeal.listingId}`}
                    className="mt-1 inline-block text-sm underline underline-offset-2"
                  >
                    View listing
                  </Link>
                ) : null}
              </div>
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{appeal.status}</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-neutral-50 px-3 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Original decision</p>
                <p className="mt-2 text-neutral-800">{appeal.decisionReason ?? "No reason recorded."}</p>
                <p className="mt-2 text-xs text-neutral-500">{appeal.policyBasis ?? "Marketplace rules"}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Seller appeal</p>
                <p className="mt-2 text-neutral-800">{appeal.reason}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  Submitted {new Date(appeal.submittedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {appeal.resolution ? (
              <p className="mt-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                <span className="font-medium">Resolution:</span> {appeal.resolution}
              </p>
            ) : null}

            {appeal.status === "pending" ? (
              <>
                <div className="mt-4 grid gap-2">
                  <label htmlFor={`appeal-resolution-${appeal.id}`} className="text-xs font-medium text-neutral-600">
                    Reasoned decision shown to the seller
                  </label>
                  <Textarea
                    id={`appeal-resolution-${appeal.id}`}
                    value={resolutions[appeal.id] ?? ""}
                    maxLength={2500}
                    onChange={(event) =>
                      setResolutions((current) => ({ ...current, [appeal.id]: event.target.value }))
                    }
                    placeholder="Explain why the original restriction is upheld or why it is being reversed."
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busyId === appeal.id || !resolutions[appeal.id]?.trim()}
                    onClick={() => void decide(appeal.id, "uphold")}
                  >
                    Uphold decision
                  </Button>
                  <Button
                    disabled={busyId === appeal.id || !resolutions[appeal.id]?.trim()}
                    onClick={() => void decide(appeal.id, "reverse")}
                  >
                    Reverse decision
                  </Button>
                </div>
              </>
            ) : null}
          </section>
        ))}
      </div>

      {!loadError && visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No moderation appeals match this view.
        </p>
      ) : null}
    </div>
  )
}
