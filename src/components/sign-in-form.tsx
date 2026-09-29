"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { FormField } from "@/components/form-field"
import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { DEFAULT_AUTH_NEXT, safeAuthNext } from "@/lib/auth-redirect"
import { boardCurrencyOptions } from "@/lib/fx"
import { useMarketplace } from "@/lib/marketplace"
import { isCurrencyPreference, type CurrencyPreference } from "@/lib/prefs"
import {
  passwordError,
  passwordStrength,
  passwordStrengthLabel,
  passwordsMatchError,
} from "@/lib/password"
import { clearTermsIntent, hasTermsIntent, rememberTermsIntent } from "@/lib/terms-client"

type Channel = "email" | "phone"
type Method = "link" | "password"
type PasswordMode = "sign-in" | "sign-up" | "forgot"

const RESEND_COOLDOWN_SECONDS = 60

export function SignInForm({ nextHref }: { nextHref?: string } = {}) {
  const auth = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reloadBoard } = useMarketplace()
  const { currency, setCurrency } = usePrefs()
  const currencies = boardCurrencyOptions()
  const next = safeAuthNext(nextHref ?? searchParams.get("next"), DEFAULT_AUTH_NEXT)

  const [channel, setChannel] = useState<Channel>("email")
  const [method, setMethod] = useState<Method>("link")
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("sign-in")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const errorParam = searchParams.get("error")

  useEffect(() => {
    // Read after mount to avoid SSR/client hydration mismatch (localStorage).
    /* eslint-disable react-hooks/set-state-in-effect -- intentional client-only restore */
    setAgreedToTerms(hasTermsIntent())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (errorParam === "link") {
      toast.error("That sign-in link is invalid or expired. Request a new one.")
    } else if (errorParam === "device") {
      toast.error(
        "Open the email link on the same device and browser that requested it, or request a new link here.",
      )
    }
  }, [errorParam])

  useEffect(() => {
    if (auth.signedIn) {
      void reloadBoard()
      router.replace(next)
    }
  }, [auth.signedIn, next, reloadBoard, router])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

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

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  function onAgreeChange(checked: boolean) {
    setAgreedToTerms(checked)
    if (checked) rememberTermsIntent()
    else clearTermsIntent()
  }

  async function sendEmailLink() {
    if (!agreedToTerms) {
      toast.error("Agree to the Terms and Privacy Policy to continue.")
      return
    }
    rememberTermsIntent()
    setBusy(true)
    const result = await auth.sendEmailCode(email, next)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    setSent(true)
    startCooldown()
    toast.success("Check your email for a sign-in link")
  }

  async function sendPhoneCode() {
    setBusy(true)
    const result = await auth.sendPhoneCode(phone)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    setSent(true)
    startCooldown()
    toast.success("Check your phone for a code")
  }

  async function verifyPhone() {
    setBusy(true)
    const result = await auth.verifyPhoneCode(phone, code)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    await reloadBoard()
    toast.success("Signed in")
    router.replace(next)
  }

  async function submitPassword() {
    if (passwordMode === "forgot") {
      setBusy(true)
      const result = await auth.requestPasswordReset(email)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      startCooldown()
      toast.success("Check your email for a reset link — open it on this device")
      return
    }

    if (passwordMode === "sign-up") {
      if (!agreedToTerms) {
        toast.error("Agree to the Terms and Privacy Policy to continue.")
        return
      }
      rememberTermsIntent()
      const reason = passwordError(password) ?? passwordsMatchError(password, confirmPassword)
      if (reason) {
        toast.error(reason)
        return
      }
      setBusy(true)
      const result = await auth.signUpWithPassword(email, password, next)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      if (result.session) {
        await reloadBoard()
        toast.success("Account created")
        router.replace(next)
        return
      }
      toast.success("Check your email for a confirmation link")
      return
    }

    setBusy(true)
    const result = await auth.signInWithPassword(email, password)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    await reloadBoard()
    toast.success("Signed in")
    router.replace(next)
  }

  async function continueWithGoogle() {
    if (!agreedToTerms) {
      toast.error("Agree to the Terms and Privacy Policy to continue.")
      return
    }
    rememberTermsIntent()
    setBusy(true)
    const result = await auth.signInWithGoogle(next)
    setBusy(false)
    if (!result.ok) toast.error(result.reason)
  }

  const strength = password ? passwordStrength(password) : null
  const showLinkFlow = method === "link" || channel === "phone"
  const showTermsCheckbox =
    auth.googleEnabled ||
    (channel === "email" && method === "link") ||
    (channel === "email" && method === "password" && passwordMode === "sign-up")
  const needsTermsForAction = showTermsCheckbox
  const showCurrencySetup =
    auth.googleEnabled ||
    (channel === "email" && method === "link" && !sent) ||
    (channel === "email" && method === "password" && passwordMode === "sign-up")

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your ads, saves, and Messages across devices. New emails create an account.
        </p>
      </header>

      {showCurrencySetup ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
          <FormField
            label="Default currency"
            htmlFor="onboarding-currency"
            hint="Prices will be shown in this currency."
          >
            <Select
              value={currency}
              onValueChange={(value) => {
                if (isCurrencyPreference(value)) setCurrency(value as CurrencyPreference)
              }}
            >
              <SelectTrigger id="onboarding-currency" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[90] max-h-72">
                {currencies.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      ) : null}

      {showTermsCheckbox ? (
        <label className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
            checked={agreedToTerms}
            onChange={(event) => onAgreeChange(event.target.checked)}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
          </span>
        </label>
      ) : null}

      {auth.googleEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={busy || !agreedToTerms}
          onClick={() => void continueWithGoogle()}
        >
          Continue with Google
        </Button>
      ) : null}

      {auth.phoneEnabled ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={channel === "email" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setChannel("email")
              setSent(false)
              setCode("")
            }}
          >
            Email
          </Button>
          <Button
            type="button"
            variant={channel === "phone" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setChannel("phone")
              setMethod("link")
              setSent(false)
              setCode("")
            }}
          >
            Phone
          </Button>
        </div>
      ) : null}

      {channel === "email" ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={method === "link" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setMethod("link")
              setPasswordMode("sign-in")
            }}
          >
            Email link
          </Button>
          <Button
            type="button"
            variant={method === "password" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setMethod("password")
              setSent(false)
              setCode("")
            }}
          >
            Password
          </Button>
        </div>
      ) : null}

      {showLinkFlow ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {channel === "email"
                ? sent
                  ? "Check your email"
                  : "Email sign-in link"
                : sent
                  ? "Enter your code"
                  : "Phone code"}
            </CardTitle>
            <CardDescription>
              {channel === "email"
                ? sent
                  ? "Open the link on this device to finish signing in."
                  : "We’ll email a one-time sign-in link. Open it on this device."
                : sent
                  ? "Enter the SMS code."
                  : "We’ll text a one-time code."}
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (busy) return
              if (channel === "email") {
                if (!sent) void sendEmailLink()
                return
              }
              if (!sent) void sendPhoneCode()
              else void verifyPhone()
            }}
          >
            <CardContent className="space-y-4">
              {channel === "email" ? (
                <FormField label="Email" htmlFor="sign-in-email" required>
                  <Input
                    id="sign-in-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-10"
                    required
                    disabled={sent}
                  />
                </FormField>
              ) : (
                <FormField label="Phone" htmlFor="sign-in-phone" required>
                  <Input
                    id="sign-in-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className="h-10"
                    required
                    disabled={sent}
                  />
                </FormField>
              )}

              {channel === "phone" && sent ? (
                <FormField label="Code" htmlFor="sign-in-code" required hint="6-digit code from your SMS">
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
                </FormField>
              ) : null}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2 sm:flex-col">
              {channel === "email" && sent ? (
                <p className="text-sm text-muted-foreground">
                  Waiting for you to open the link… You can resend after the cooldown.
                </p>
              ) : (
                <Button
                  type="submit"
                  disabled={busy || (channel === "email" && !sent && !agreedToTerms)}
                  className="h-10 w-full"
                >
                  {busy
                    ? "Please wait…"
                    : channel === "email"
                      ? "Email me a link"
                      : sent
                        ? "Verify and sign in"
                        : "Send code"}
                </Button>
              )}
              {sent ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || cooldown > 0 || (channel === "email" && !agreedToTerms)}
                    onClick={() => void (channel === "email" ? sendEmailLink() : sendPhoneCode())}
                  >
                    {cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : channel === "email"
                        ? "Resend link"
                        : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setSent(false)
                      setCode("")
                    }}
                  >
                    Use a different {channel === "email" ? "email" : "number"}
                  </Button>
                </div>
              ) : null}
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {passwordMode === "forgot"
                ? "Reset password"
                : passwordMode === "sign-up"
                  ? "Create account"
                  : "Sign in with password"}
            </CardTitle>
            <CardDescription>
              {passwordMode === "forgot"
                ? "We’ll email a reset link. Open it on this same device and browser."
                : passwordMode === "sign-up"
                  ? "Confirm your email with the link we send, then sign in."
                  : "Use the password you set on your Profile."}
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (busy) return
              void submitPassword()
            }}
          >
            <CardContent className="space-y-4">
              <FormField label="Email" htmlFor="password-email" required>
                <Input
                  id="password-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-10"
                  required
                />
              </FormField>

              {passwordMode !== "forgot" ? (
                <FormField
                  label="Password"
                  htmlFor="password-field"
                  required
                  hint={
                    passwordMode === "sign-up" && strength
                      ? passwordStrengthLabel(strength)
                      : undefined
                  }
                >
                  <Input
                    id="password-field"
                    type="password"
                    autoComplete={passwordMode === "sign-up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10"
                    required
                  />
                </FormField>
              ) : null}

              {passwordMode === "sign-up" ? (
                <FormField label="Confirm password" htmlFor="password-confirm" required>
                  <Input
                    id="password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-10"
                    required
                  />
                </FormField>
              ) : null}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2 sm:flex-col">
              <Button
                type="submit"
                disabled={
                  busy ||
                  (passwordMode === "forgot" && cooldown > 0) ||
                  (passwordMode === "sign-up" && !agreedToTerms)
                }
                className="h-10 w-full"
              >
                {busy
                  ? "Please wait…"
                  : passwordMode === "forgot"
                    ? cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Send reset link"
                    : passwordMode === "sign-up"
                      ? "Create account"
                      : "Sign in"}
              </Button>
              <div className="flex flex-wrap gap-2">
                {passwordMode === "sign-in" ? (
                  <>
                    <Button type="button" variant="ghost" onClick={() => setPasswordMode("forgot")}>
                      Forgot password
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setPasswordMode("sign-up")}>
                      Create account
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setPasswordMode("sign-in")}>
                    Back to password sign-in
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
      {needsTermsForAction && !agreedToTerms ? (
        <p className="text-xs text-neutral-500">
          Tick the box above to email a link, create an account, or continue with Google.
        </p>
      ) : null}
    </div>
  )
}

export function KeepAdsPrompt({ className }: { className?: string }) {
  const auth = useAuth()
  if (!auth.ready || auth.signedIn || !auth.configured) return null
  return (
    <div className={className ?? "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"}>
      <p className="font-medium">Sign in to post and keep ads</p>
      <p className="mt-1 text-amber-900/80">
        New ads need an account.{" "}
        <Link href="/sign-in" className="font-medium underline underline-offset-2">
          Sign in with email
        </Link>{" "}
        to post, and to move any older browser-owned posts onto your account.
      </p>
    </div>
  )
}
