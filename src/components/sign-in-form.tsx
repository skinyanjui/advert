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
  const { currency, setCurrency, t } = usePrefs()
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
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const errorParam = searchParams.get("error")

  useEffect(() => {
    // Read after mount to avoid SSR/client hydration mismatch (localStorage).
    /* eslint-disable react-hooks/set-state-in-effect -- intentional client-only restore */
    const restored = hasTermsIntent()
    setAgeConfirmed(restored)
    setAgreedToTerms(restored)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (errorParam === "link") {
      toast.error(t("auth.toast.linkInvalid"))
    } else if (errorParam === "device") {
      toast.error(t("auth.toast.linkWrongDevice"))
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
        title={t("auth.notConfiguredTitle")}
        body={t("auth.notConfiguredBody")}
        actionHref="/"
        actionLabel={t("saved.browse")}
        className="mt-0 py-10"
        headingLevel={1}
      />
    )
  }

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  function syncLegalIntent(nextAge: boolean, nextTerms: boolean) {
    if (nextAge && nextTerms) rememberTermsIntent()
    else clearTermsIntent()
  }

  function onAgeChange(checked: boolean) {
    setAgeConfirmed(checked)
    syncLegalIntent(checked, agreedToTerms)
  }

  function onAgreeChange(checked: boolean) {
    setAgreedToTerms(checked)
    syncLegalIntent(ageConfirmed, checked)
  }

  function requireLegalIntent(): boolean {
    if (!ageConfirmed) {
      toast.error(t("auth.mustConfirmAge"))
      return false
    }
    if (!agreedToTerms) {
      toast.error(t("auth.mustAgree"))
      return false
    }
    rememberTermsIntent()
    return true
  }

  async function sendEmailLink() {
    if (!requireLegalIntent()) return
    setBusy(true)
    const result = await auth.sendEmailCode(email, next)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    setSent(true)
    startCooldown()
    toast.success(t("auth.toast.linkSent"))
  }

  async function sendPhoneCode() {
    if (!requireLegalIntent()) return
    setBusy(true)
    const result = await auth.sendPhoneCode(phone)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    setSent(true)
    startCooldown()
    toast.success(t("auth.toast.codeSent"))
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
    toast.success(t("auth.toast.signedIn"))
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
      toast.success(t("auth.toast.resetSent"))
      return
    }

    if (passwordMode === "sign-up") {
      if (!requireLegalIntent()) return
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
        toast.success(t("auth.toast.accountCreated"))
        router.replace(next)
        return
      }
      toast.success(t("auth.toast.confirmEmail"))
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
    toast.success(t("auth.toast.signedIn"))
    router.replace(next)
  }

  async function continueWithGoogle() {
    if (!requireLegalIntent()) return
    setBusy(true)
    const result = await auth.signInWithGoogle(next)
    setBusy(false)
    if (!result.ok) toast.error(result.reason)
  }

  const strength = password ? passwordStrength(password) : null
  const showLinkFlow = method === "link" || channel === "phone"
  const showTermsCheckbox =
    auth.googleEnabled ||
    channel === "phone" ||
    (channel === "email" && method === "link") ||
    (channel === "email" && method === "password" && passwordMode === "sign-up")
  const needsTermsForAction = showTermsCheckbox
  const legalReady = ageConfirmed && agreedToTerms
  const showCurrencySetup =
    auth.googleEnabled ||
    (channel === "email" && method === "link" && !sent) ||
    (channel === "email" && method === "password" && passwordMode === "sign-up")

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.signIn")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("auth.accountAccessBody")}
        </p>
      </header>

      {showCurrencySetup ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
          <FormField
            label={t("prefs.currency")}
            htmlFor="onboarding-currency"
            hint={t("prefs.currencyHint")}
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
        <div className="space-y-2">
          <label className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
              checked={ageConfirmed}
              onChange={(event) => onAgeChange(event.target.checked)}
            />
            <span>{t("auth.ageConfirm")}</span>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
              checked={agreedToTerms}
              onChange={(event) => onAgreeChange(event.target.checked)}
            />
            <span>
              {t("auth.legalAgreementPrefix")}{" "}
              <Link href="/terms" className="underline underline-offset-2">
                {t("auth.terms")}
              </Link>{" "}
              {t("auth.legalAgreementPrivacy")}{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                {t("auth.privacyPolicy")}
              </Link>
              .
            </span>
          </label>
        </div>
      ) : null}

      {auth.googleEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={busy || !legalReady}
          onClick={() => void continueWithGoogle()}
        >
          {t("auth.continueGoogle")}
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
            {t("auth.channelEmail")}
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
            {t("auth.channelPhone")}
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
            {t("auth.methodLink")}
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
            {t("auth.methodPassword")}
          </Button>
        </div>
      ) : null}

      {showLinkFlow ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {channel === "email"
                ? sent
                  ? t("auth.emailLinkSent")
                  : t("auth.emailLink")
                : sent
                  ? t("auth.phoneCodeSent")
                  : t("auth.phoneCode")}
            </CardTitle>
            <CardDescription>
              {channel === "email"
                ? sent
                  ? t("auth.emailLinkSentHint")
                  : t("auth.emailLinkHint")
                : sent
                  ? t("auth.phoneCodeSentHint")
                  : t("auth.phoneCodeHint")}
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
                <FormField label={t("auth.email")} htmlFor="sign-in-email" required>
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
                <FormField label={t("auth.phone")} htmlFor="sign-in-phone" required>
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
                <FormField label={t("auth.code")} htmlFor="sign-in-code" required hint={t("auth.codeHint")}>
                  <Input
                    id="sign-in-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t("auth.codePlaceholder")}
                    className="h-10"
                    required
                  />
                </FormField>
              ) : null}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2 sm:flex-col">
              {channel === "email" && sent ? (
                <p className="text-sm text-muted-foreground">
                  {t("auth.waitingEmailLink")}
                </p>
              ) : (
                <Button
                  type="submit"
                  disabled={busy || (!sent && !legalReady)}
                  className="h-10 w-full"
                >
                  {busy
                    ? t("auth.pleaseWait")
                    : channel === "email"
                      ? t("auth.sendLink")
                      : sent
                        ? t("auth.verifySignIn")
                        : t("auth.sendCode")}
                </Button>
              )}
              {sent ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || cooldown > 0 || !legalReady}
                    onClick={() => void (channel === "email" ? sendEmailLink() : sendPhoneCode())}
                  >
                    {cooldown > 0
                      ? t("auth.resendIn", { seconds: cooldown })
                      : channel === "email"
                        ? t("auth.resendLink")
                        : t("auth.resendCode")}
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
                    {channel === "email" ? t("auth.useDifferentEmail") : t("auth.useDifferentPhone")}
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
                ? t("auth.resetPassword")
                : passwordMode === "sign-up"
                  ? t("auth.createAccount")
                  : t("auth.passwordSignIn")}
            </CardTitle>
            <CardDescription>
              {passwordMode === "forgot"
                ? t("auth.resetPasswordHint")
                : passwordMode === "sign-up"
                  ? t("auth.createAccountHint")
                  : t("auth.passwordSignInHint")}
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
              <FormField label={t("auth.email")} htmlFor="password-email" required>
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
                  label={t("auth.password")}
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
                <FormField label={t("auth.confirmPassword")} htmlFor="password-confirm" required>
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
                  (passwordMode === "sign-up" && !legalReady)
                }
                className="h-10 w-full"
              >
                {busy
                  ? t("auth.pleaseWait")
                  : passwordMode === "forgot"
                    ? cooldown > 0
                      ? `Resend in ${cooldown}s`
                       : t("auth.sendResetLink")
                    : passwordMode === "sign-up"
                      ? t("auth.createAccount")
                      : t("auth.signIn")}
              </Button>
              <div className="flex flex-wrap gap-2">
                {passwordMode === "sign-in" ? (
                  <>
                    <Button type="button" variant="ghost" onClick={() => setPasswordMode("forgot")}>
                      {t("auth.forgotPassword")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setPasswordMode("sign-up")}>
                      {t("auth.createAccount")}
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setPasswordMode("sign-in")}>
                    {t("auth.backPasswordSignIn")}
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
      {needsTermsForAction && !legalReady ? (
        <p className="text-xs text-neutral-500">
          {t("auth.termsHelp")}
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
