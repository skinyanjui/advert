import assert from "node:assert/strict"
import { test } from "node:test"

import { decideAuthCallback } from "../src/lib/auth-callback"
import { mapAuthError } from "../src/lib/auth-errors"
import {
  DEFAULT_AUTH_NEXT,
  applySafeAuthNext,
  isProtectedAuthPath,
  safeAuthNext,
  signInHref,
} from "../src/lib/auth-redirect"
import {
  PASSWORD_MIN_LENGTH,
  passwordError,
  passwordStrength,
  passwordStrengthLabel,
  passwordsMatchError,
} from "../src/lib/password"
import { DRAFT_MAX_AGE_MS, isPostDraftExpired } from "../src/lib/post-draft"

test("auth next path rejects open redirects", () => {
  assert.equal(safeAuthNext(null), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/my-ads"), "/my-ads")
  assert.equal(safeAuthNext("/messages?thread=1"), "/messages?thread=1")
  assert.equal(safeAuthNext("/account#profile"), "/account#profile")
  assert.equal(safeAuthNext("//evil.example"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("https://evil.example"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("http://evil.example/phish"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/\\evil"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/\\\\evil.com"), DEFAULT_AUTH_NEXT)
})

test("auth next path rejects control characters and whitespace open redirects", () => {
  assert.equal(safeAuthNext("/\t/evil.com"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/\n/evil.com"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/\r/evil.com"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext(" /my-ads"), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/my-ads "), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext("/my ads"), DEFAULT_AUTH_NEXT)
  // Encoded controls decode before safeAuthNext (as URLSearchParams does).
  assert.equal(safeAuthNext(decodeURIComponent("/%09/evil.com")), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext(decodeURIComponent("/%0A/evil.com")), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext(decodeURIComponent("/%0D/evil.com")), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext(decodeURIComponent("%20/my-ads")), DEFAULT_AUTH_NEXT)
  assert.equal(safeAuthNext(decodeURIComponent("/%5Cevil")), DEFAULT_AUTH_NEXT)
})

test("safeAuthNext never resolves to an external host via URL()", () => {
  for (const candidate of [
    "/\t/evil.com",
    "/\n/evil.com",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "  //evil.com",
  ]) {
    const safe = safeAuthNext(candidate)
    const resolved = new URL(safe, "https://adverts-murex.vercel.app")
    assert.equal(resolved.host, "adverts-murex.vercel.app")
  }
})

test("applySafeAuthNext sets pathname search and hash separately", () => {
  const target = new URL("https://adverts-murex.vercel.app/sign-in?error=link")
  applySafeAuthNext(target, "/messages?c=1#top")
  assert.equal(target.pathname, "/messages")
  assert.equal(target.search, "?c=1")
  assert.equal(target.hash, "#top")
  assert.equal(target.host, "adverts-murex.vercel.app")
})

test("callback and confirm share the same next-param safety", () => {
  assert.equal(safeAuthNext("/auth/reset", "/auth/reset"), "/auth/reset")
  assert.equal(safeAuthNext("//evil", "/auth/reset"), "/auth/reset")
  assert.equal(signInHref("/my-ads"), "/sign-in?next=%2Fmy-ads")
  assert.equal(signInHref("/account"), "/sign-in")
})

test("protected routes match my-ads, messages, and admin reports", () => {
  assert.equal(isProtectedAuthPath("/my-ads"), true)
  assert.equal(isProtectedAuthPath("/my-ads/"), true)
  assert.equal(isProtectedAuthPath("/messages"), true)
  assert.equal(isProtectedAuthPath("/admin/reports"), true)
  assert.equal(isProtectedAuthPath("/admin/reports/x"), true)
  assert.equal(isProtectedAuthPath("/account"), false)
  assert.equal(isProtectedAuthPath("/post"), false)
  assert.equal(isProtectedAuthPath("/sign-in"), false)
})

test("protected-route sign-in href preserves next", () => {
  const href = signInHref("/messages?c=1")
  assert.equal(href, "/sign-in?next=%2Fmessages%3Fc%3D1")
  const next = new URL(href, "https://adverts-murex.vercel.app").searchParams.get("next")
  assert.equal(safeAuthNext(next), "/messages?c=1")
})

test("mapAuthError covers rate limits, expired codes, unconfirmed, and wrong password", () => {
  assert.match(mapAuthError({ status: 429, message: "over_email_send_rate_limit" }), /Too many emails/)
  assert.match(mapAuthError({ message: "Email rate limit exceeded" }), /Too many emails/)
  assert.match(mapAuthError({ message: "Token has expired or is invalid" }), /expired|invalid/i)
  assert.match(mapAuthError({ message: "otp_expired" }), /expired/)
  assert.match(mapAuthError({ message: "Email not confirmed" }), /Confirm your email/)
  assert.match(mapAuthError({ message: "Invalid login credentials" }), /Wrong email or password/)
  assert.match(mapAuthError({ message: "token is invalid" }), /invalid/)
  assert.match(mapAuthError({ code: "reauthentication_needed", message: "Reauthentication required" }), /verification code/i)
})

test("mapAuthError uses a generic fallback for unknown errors", () => {
  assert.equal(mapAuthError({ message: "weird upstream boom xyz" }), "Something went wrong. Try again.")
  assert.equal(mapAuthError({}), "Something went wrong. Try again.")
})

test("password validation and strength hint", () => {
  assert.equal(passwordError(""), "Enter a password.")
  assert.match(passwordError("short") ?? "", new RegExp(String(PASSWORD_MIN_LENGTH)))
  assert.equal(passwordError("longenough"), undefined)
  assert.equal(passwordStrength("short"), "too-short")
  assert.equal(passwordStrength("password1"), "weak")
  assert.equal(passwordStrength("Password1"), "ok")
  assert.equal(passwordStrength("Password1!abc"), "strong")
  assert.match(passwordStrengthLabel("weak"), /Weak/)
  assert.equal(passwordsMatchError("abc12345", "abc12345"), undefined)
  assert.equal(passwordsMatchError("abc12345", "other"), "Passwords do not match.")
})

test("phone auth flag is off unless explicitly enabled", () => {
  assert.notEqual(process.env.NEXT_PUBLIC_AUTH_PHONE, "1")
})

test("google auth flag is off unless explicitly enabled", () => {
  assert.notEqual(process.env.NEXT_PUBLIC_AUTH_GOOGLE, "1")
})

test("authConfigured matches public Supabase URL + publishable key", async () => {
  const { authConfigured } = await import("../src/lib/supabase/env")
  const expected = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.SUPABASE_ANON_KEY),
  )
  assert.equal(authConfigured(), expected)
})

test("auth callback prefers existing session over re-exchanging the code", () => {
  assert.deepEqual(
    decideAuthCallback({
      hasSession: true,
      code: "abc",
      accessToken: null,
      refreshToken: null,
      errorDescription: null,
      goingToReset: false,
    }),
    { action: "succeed" },
  )
  assert.deepEqual(
    decideAuthCallback({
      hasSession: false,
      code: "abc",
      accessToken: null,
      refreshToken: null,
      errorDescription: null,
      goingToReset: false,
    }),
    { action: "exchange-code", code: "abc" },
  )
  assert.deepEqual(
    decideAuthCallback({
      hasSession: false,
      code: null,
      accessToken: "at",
      refreshToken: "rt",
      errorDescription: null,
      goingToReset: false,
    }),
    { action: "set-session", accessToken: "at", refreshToken: "rt" },
  )
  assert.deepEqual(
    decideAuthCallback({
      hasSession: false,
      code: null,
      accessToken: null,
      refreshToken: null,
      errorDescription: null,
      goingToReset: true,
    }),
    { action: "fail", kind: "device" },
  )
  assert.deepEqual(
    decideAuthCallback({
      hasSession: false,
      code: "abc",
      accessToken: null,
      refreshToken: null,
      errorDescription: "access_denied",
      goingToReset: false,
    }),
    { action: "fail", kind: "link" },
  )
})

test("post drafts expire after seven days", () => {
  const now = Date.UTC(2026, 8, 28)
  assert.equal(isPostDraftExpired(now - DRAFT_MAX_AGE_MS + 1, now), false)
  assert.equal(isPostDraftExpired(now - DRAFT_MAX_AGE_MS - 1, now), true)
})

test("createListingAuthError requires auth when configured", async () => {
  const { createListingAuthError } = await import("../src/lib/listing-create-auth")
  assert.equal(createListingAuthError("session", true), "Sign in to post an ad.")
  assert.equal(createListingAuthError("auth", true), undefined)
  assert.equal(createListingAuthError("session", false), undefined)
  assert.equal(createListingAuthError("auth", false), undefined)
})
