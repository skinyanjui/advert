"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { ModerationDecisionRecord } from "@/lib/moderation-redress"

export function ModerationDecisionsPage({ now }: { now: string }) {
  const [decisions, setDecisions] = useState<ModerationDecisionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/moderation/decisions", { cache: "no-store" })
      const payload = (await response.json()) as { decisions?: ModerationDecisionRecord[]; reason?: string }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not load moderation decisions.")
        return
      }
      setDecisions(Array.isArray(payload.decisions) ? payload.decisions : [])
    } catch {
      toast.error("Could not load moderation decisions.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function appeal(decisionId: string) {
    const reason = reasons[decisionId]?.trim() ?? ""
    if (reason.length < 10) {
      toast.error("Add enough detail for a reviewer to understand your appeal.")
      return
    }
    setBusyId(decisionId)
    try {
      const response = await fetch("/api/moderation/appeals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moderationActionId: decisionId, reason }),
      })
      const payload = (await response.json()) as { reason?: string }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not submit the appeal.")
        return
      }
      setReasons((current) => ({ ...current, [decisionId]: "" }))
      toast.success("Appeal submitted")
      await load()
    } catch {
      toast.error("Could not submit the appeal.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="w-full px-3 py-8 md:px-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Moderation decisions</h1>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Review restrictions applied to your listings, the reason provided, and any available appeal.
        </p>
      </header>

      {loading ? <p className="mt-6 text-sm text-neutral-500">Loading decisions…</p> : null}

      {!loading && decisions.length === 0 ? (
        <p className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No moderation restrictions are recorded for this account.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4">
        {decisions.map((decision) => {
          const appealOpen =
            Boolean(decision.appealUntil) &&
            new Date(decision.appealUntil!).getTime() >= new Date(now).getTime() &&
            !decision.appeal
          return (
            <Card key={decision.id}>
              <CardHeader>
                <CardTitle>{decision.listingTitle ?? "Listing moderation decision"}</CardTitle>
                <CardDescription>
                  {decision.restrictionType === "content_removed" ? "Removed from public view" : "Visibility restricted"}
                  {" · "}
                  {new Date(decision.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Reason</p>
                  <p className="mt-1 text-neutral-800">{decision.decisionReason ?? "No additional reason was recorded."}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Policy basis</p>
                  <p className="mt-1 text-neutral-700">{decision.policyBasis ?? "Marketplace rules"}</p>
                </div>
                <p className="text-xs text-neutral-500">
                  Decision method: {decision.automated ? "automated" : "human review"}
                </p>
                {decision.appealUntil ? (
                  <p className="text-xs text-neutral-500">
                    Appeal available through {new Date(decision.appealUntil).toLocaleDateString()}.
                  </p>
                ) : null}

                {decision.appeal ? (
                  <div className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="font-medium text-neutral-800">
                      Appeal: {decision.appeal.status}
                    </p>
                    <p className="mt-1 text-neutral-600">{decision.appeal.reason}</p>
                    {decision.appeal.resolution ? (
                      <p className="mt-2 text-neutral-700">
                        <span className="font-medium">Resolution:</span> {decision.appeal.resolution}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {appealOpen ? (
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600" htmlFor={`appeal-${decision.id}`}>
                      Why should this decision be changed?
                    </label>
                    <Textarea
                      id={`appeal-${decision.id}`}
                      value={reasons[decision.id] ?? ""}
                      maxLength={2500}
                      onChange={(event) =>
                        setReasons((current) => ({ ...current, [decision.id]: event.target.value }))
                      }
                      placeholder="Explain the facts a reviewer should reconsider. You do not need to cite a law."
                    />
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex-wrap gap-2">
                {appealOpen ? (
                  <Button
                    disabled={busyId === decision.id || (reasons[decision.id]?.trim().length ?? 0) < 10}
                    onClick={() => void appeal(decision.id)}
                  >
                    {busyId === decision.id ? "Submitting…" : "Submit appeal"}
                  </Button>
                ) : null}
                {decision.listingId ? (
                  <Button asChild variant="outline">
                    <Link href={`/listings/${decision.listingId}`}>View listing</Link>
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        If a law gives you additional redress rights, this in-product appeal does not remove them. See the{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  )
}
