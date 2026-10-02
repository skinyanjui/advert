"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const categories = [
  ["account", "Account access"],
  ["moderation", "Listings & moderation"],
  ["safety", "Safety & abuse"],
  ["security", "Security"],
  ["legal", "Legal & compliance"],
  ["general", "General help"],
] as const

export function SupportRequestForm() {
  const [category, setCategory] = useState<(typeof categories)[number][0]>("account")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [website, setWebsite] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setStatus(null)
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, email, subject, message, website }),
      })
      const payload = await response.json() as { reason?: string; requestId?: string; expectation?: string }
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.reason ?? "Could not submit the request." })
        return
      }
      setStatus({
        kind: "success",
        message: `Request received${payload.requestId ? ` · ${payload.requestId}` : ""}. ${payload.expectation ?? ""}`.trim(),
      })
      setSubject("")
      setMessage("")
    } catch {
      setStatus({ kind: "error", message: "Could not submit the request. Check your connection and try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-4" aria-labelledby="support-request-heading">
      <div>
        <h2 id="support-request-heading" className="text-base font-semibold">Send a support request</h2>
        <p className="mt-1 text-sm text-muted-foreground">No account is required. Do not include passwords, payment-card details, government IDs, or medical information.</p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="support-category">What do you need help with?</Label>
        <select
          id="support-category"
          value={category}
          onChange={(event) => setCategory(event.target.value as (typeof categories)[number][0])}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="support-email">Email</Label>
        <Input id="support-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="support-subject">Subject</Label>
        <Input id="support-subject" required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="support-message">Details</Label>
        <Textarea id="support-message" required minLength={10} maxLength={4000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>

      <div className="sr-only" aria-hidden="true">
        <Label htmlFor="support-website">Website</Label>
        <Input id="support-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>

      {status ? (
        <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>
          {status.message}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-fit">
        {submitting ? "Sending…" : "Send request"}
      </Button>
    </form>
  )
}
