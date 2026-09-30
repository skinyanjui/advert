"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth"
import {
  privacyJurisdictionLabel,
  privacyJurisdictions,
  privacyRequestTypeLabel,
  privacyRequestTypes,
  privacyStatusLabel,
  type PrivacyJurisdiction,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from "@/lib/privacy-rights"

type RequestRecord = {
  id: string
  jurisdiction: PrivacyJurisdiction
  requestType: PrivacyRequestType
  status: PrivacyRequestStatus
  receivedAt: string
  dueAt: string
  resolution: string | null
}

export function PrivacyRequestPage() {
  const auth = useAuth()
  const [email, setEmail] = useState("")
  const [actingAsAgent, setActingAsAgent] = useState(false)
  const [subjectEmail, setSubjectEmail] = useState("")
  const [jurisdiction, setJurisdiction] = useState<PrivacyJurisdiction>("other")
  const [requestType, setRequestType] = useState<PrivacyRequestType>("access")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<RequestRecord[]>([])
  const [submitted, setSubmitted] = useState<RequestRecord | null>(null)
  const accountEmail = auth.email?.trim().toLowerCase() ?? ""

  useEffect(() => {
    if (accountEmail) setEmail(accountEmail)
  }, [accountEmail])

  useEffect(() => {
    if (!auth.ready || !auth.signedIn) return
    void fetch("/api/privacy/requests", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const payload = (await response.json()) as { requests?: RequestRecord[] }
        setRequests(Array.isArray(payload.requests) ? payload.requests : [])
      })
      .catch(() => {})
  }, [auth.ready, auth.signedIn])

  const currentNote = useMemo(() => {
    if (requestType === "opt_out") {
      return "The current application does not sell personal information or use it for targeted advertising or significant-decision profiling. You can still record this request."
    }
    if (requestType === "correction") {
      return "You can correct profile fields directly in Profile. Use this request for data you cannot correct yourself."
    }
    if (requestType === "portability" || requestType === "access") {
      return "Signed-in users can also download a JSON copy of account data from Profile."
    }
    if (requestType === "deletion") {
      return "Signed-in users can delete their account directly from Profile. Use this request if you need help or a narrower deletion."
    }
    return null
  }, [requestType])

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/privacy/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          actingAsAgent,
          subjectEmail: actingAsAgent ? subjectEmail : null,
          jurisdiction,
          requestType,
          details,
          locale:
            document.documentElement.lang?.trim() ||
            navigator.language?.trim() ||
            null,
        }),
      })
      const payload = (await response.json()) as {
        reason?: string
        request?: RequestRecord
        verificationRequired?: boolean
      }
      if (!response.ok || !payload.request) {
        toast.error(payload.reason ?? "Could not submit the privacy request.")
        return
      }
      setSubmitted(payload.request)
      setRequests((current) => [payload.request!, ...current.filter((item) => item.id !== payload.request!.id)])
      setDetails("")
      toast.success(
        payload.verificationRequired
          ? "Request received. Identity verification is required before account data is disclosed or changed."
          : "Privacy request received.",
      )
    } catch {
      toast.error("Could not submit the privacy request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-10 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy request</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Use this form to exercise privacy rights that apply to you. We use a 30-day internal response target;
          a legal deadline may differ by jurisdiction or request.
        </p>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Do not enter passwords, government ID numbers, bank information, medical information, or other sensitive documents in this form.
        If identity verification is needed, we will use a separate verification step.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
          <CardDescription>
            Choose the location and right that best fit the request. Choosing “Other / not sure” will not block review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="privacy-email">Contact email</Label>
            <Input
              id="privacy-email"
              type="email"
              autoComplete="email"
              value={email}
              readOnly={Boolean(accountEmail)}
              aria-readonly={Boolean(accountEmail)}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={actingAsAgent}
              onChange={(event) => setActingAsAgent(event.target.checked)}
            />
            <span>I am an authorized agent or representative acting for another person.</span>
          </label>

          {actingAsAgent ? (
            <div className="grid gap-2">
              <Label htmlFor="privacy-subject-email">Person&apos;s account/contact email</Label>
              <Input
                id="privacy-subject-email"
                type="email"
                value={subjectEmail}
                onChange={(event) => setSubjectEmail(event.target.value)}
                placeholder="person@example.com"
              />
              <p className="text-xs text-neutral-500">
                We may ask for proof of authority and identity before acting on the request.
              </p>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="privacy-jurisdiction">Jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={(value) => setJurisdiction(value as PrivacyJurisdiction)}>
                <SelectTrigger id="privacy-jurisdiction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {privacyJurisdictions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="privacy-request-type">Request</Label>
              <Select value={requestType} onValueChange={(value) => setRequestType(value as PrivacyRequestType)}>
                <SelectTrigger id="privacy-request-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {privacyRequestTypes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentNote ? (
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{currentNote}</p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="privacy-details">Details (optional)</Label>
            <Textarea
              id="privacy-details"
              value={details}
              maxLength={1500}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Describe what you want us to review. Do not include sensitive identification documents."
            />
            <p className="text-xs text-neutral-500">{details.length}/1500</p>
          </div>

          <Button
            type="button"
            disabled={submitting || !email.trim() || (actingAsAgent && !subjectEmail.trim())}
            onClick={() => void submit()}
          >
            {submitting ? "Submitting…" : "Submit privacy request"}
          </Button>
        </CardContent>
      </Card>

      {submitted ? (
        <Card>
          <CardHeader>
            <CardTitle>Request received</CardTitle>
            <CardDescription>Keep this tracking ID for reference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-neutral-500">Tracking ID:</span> <code>{submitted.id}</code></p>
            <p><span className="text-neutral-500">Status:</span> {privacyStatusLabel(submitted.status)}</p>
            <p><span className="text-neutral-500">Internal target:</span> {new Date(submitted.dueAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      ) : null}

      {auth.signedIn && requests.length > 0 ? (
        <section>
          <h2 className="text-base font-medium text-neutral-950">Your requests</h2>
          <ul className="mt-3 grid gap-2">
            {requests.map((request) => (
              <li key={request.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-900">{privacyRequestTypeLabel(request.requestType)}</p>
                    <p className="text-xs text-neutral-500">
                      {privacyJurisdictionLabel(request.jurisdiction)} · {new Date(request.receivedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{privacyStatusLabel(request.status)}</span>
                </div>
                {request.resolution ? <p className="mt-2 text-neutral-600">{request.resolution}</p> : null}
                <p className="mt-2 break-all text-xs text-neutral-400">{request.id}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm text-neutral-500">
        See{" "}
        <Link href="/privacy/choices" className="underline underline-offset-2">Privacy choices</Link>
        {" "}and the{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  )
}
