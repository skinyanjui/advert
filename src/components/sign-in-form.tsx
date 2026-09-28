"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import { useMarketplace } from "@/lib/marketplace"

type Mode = "email" | "phone"

export function SignInForm({ nextHref = "/account" }: { nextHref?: string }) {
  const auth = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reloadBoard } = useMarketplace()
  const [mode, setMode] = useState<Mode>("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const errorParam = searchParams.get("error")

  useEffect(() => {
    if (errorParam === "link") toast.error("That sign-in link is invalid or expired. Request a new code.")
  }, [errorParam])

  useEffect(() => {
    if (auth.signedIn) {
      void reloadBoard()
      router.replace(nextHref)
    }
  }, [auth.signedIn, nextHref, reloadBoard, router])

  if (!auth.configured) {
    return (
      <EmptyPanel
        title="Sign-in is not configured"
        body="Add the public Supabase URL and publishable key, enable Email auth, and apply the seller-accounts SQL migration. Until then you can still post with this browser session."
        actionHref="/post"
        actionLabel="Post an ad"
        className="mt-0 py-10"
        headingLevel={1}
      />
    )
  }

  async function sendCode() {
    setBusy(true)
    const result =
      mode === "email" ? await auth.sendEmailCode(email) : await auth.sendPhoneCode(phone)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    setSent(true)
    toast.success(mode === "email" ? "Check your email for a code" : "Check your phone for a code")
  }

  async function verify() {
    setBusy(true)
    const result =
      mode === "email" ? await auth.verifyEmailCode(email, code) : await auth.verifyPhoneCode(phone, code)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    await reloadBoard()
    toast.success("Signed in")
    router.replace(nextHref)
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Keep your ads, saves, and messages across devices. Posting without an account still works on this browser —
        sign in when you want them to travel with you.
      </p>

      {auth.phoneEnabled ? (
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant={mode === "email" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setMode("email")
              setSent(false)
              setCode("")
            }}
          >
            Email
          </Button>
          <Button
            type="button"
            variant={mode === "phone" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setMode("phone")
              setSent(false)
              setCode("")
            }}
          >
            Phone
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-neutral-500">
          Phone/SMS sign-in is ready in the app once an SMS provider is attached in Supabase. Email works now.
        </p>
      )}

      <form
        className="mt-5 grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          if (!sent) void sendCode()
          else void verify()
        }}
      >
        {mode === "email" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-10"
              required
            />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="sign-in-phone">Phone</Label>
            <Input
              id="sign-in-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="h-10"
              required
            />
          </div>
        )}

        {sent ? (
          <div className="grid gap-1.5">
            <Label htmlFor="sign-in-code">Code</Label>
            <Input
              id="sign-in-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="6-digit code"
              className="h-10"
              required
            />
            <p className="text-xs text-neutral-500">
              {mode === "email"
                ? "Use the code from the email, or open the magic link on this device."
                : "Enter the SMS code."}
            </p>
          </div>
        ) : null}

        <Button type="submit" disabled={busy} className="h-10 rounded-full">
          {busy ? "Please wait…" : sent ? "Verify and sign in" : "Send code"}
        </Button>
        {sent ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setSent(false)
              setCode("")
            }}
          >
            Use a different {mode === "email" ? "email" : "number"}
          </Button>
        ) : null}
      </form>
    </div>
  )
}

export function KeepAdsPrompt({ className }: { className?: string }) {
  const auth = useAuth()
  if (!auth.ready || auth.signedIn || !auth.configured) return null
  return (
    <div className={className ?? "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"}>
      <p className="font-medium">Keep these ads if you clear cookies</p>
      <p className="mt-1 text-amber-900/80">
        This browser owns your posts for now.{" "}
        <Link href="/sign-in" className="font-medium underline underline-offset-2">
          Sign in with email
        </Link>{" "}
        to move them onto your account.
      </p>
    </div>
  )
}
