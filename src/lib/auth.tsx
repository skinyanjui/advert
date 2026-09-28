"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { toast } from "sonner"

import { isReauthenticationRequired, mapAuthError } from "@/lib/auth-errors"
import { DEFAULT_AUTH_NEXT, safeAuthNext } from "@/lib/auth-redirect"
import { reloadBoard } from "@/lib/marketplace"
import { passwordError } from "@/lib/password"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { authConfigured, googleAuthEnabled, phoneAuthEnabled } from "@/lib/supabase/env"
import { recordPendingTermsAcceptance } from "@/lib/terms-client"

type AuthResult =
  | { ok: true; session?: boolean; needsEmailConfirm?: boolean }
  | { ok: false; reason: string; needsReauth?: boolean }

type AuthContextValue = {
  ready: boolean
  configured: boolean
  phoneEnabled: boolean
  googleEnabled: boolean
  user: User | null
  email: string | null
  pendingEmail: string | null
  signedIn: boolean
  sendEmailCode: (email: string, next?: string) => Promise<AuthResult>
  verifyEmailCode: (email: string, token: string) => Promise<AuthResult>
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>
  signUpWithPassword: (email: string, password: string, next?: string) => Promise<AuthResult>
  requestPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string, nonce?: string) => Promise<AuthResult>
  requestPasswordReauth: () => Promise<AuthResult>
  updateEmail: (email: string) => Promise<AuthResult>
  signInWithGoogle: (next?: string) => Promise<AuthResult>
  sendPhoneCode: (phone: string) => Promise<AuthResult>
  verifyPhoneCode: (phone: string, token: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  signOutAll: () => Promise<void>
  claimBrowserSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function callbackRedirect(next?: string): string {
  const safe = safeAuthNext(next, DEFAULT_AUTH_NEXT)
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safe)}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = authConfigured()
  const phoneEnabled = phoneAuthEnabled()
  const googleEnabled = googleAuthEnabled()
  const [ready, setReady] = useState(!configured)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!configured) return
    const supabase = createBrowserSupabase()
    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user ?? null)
      setReady(true)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [configured])

  const claimBrowserSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
      if (!response.ok) return
      const payload = (await response.json()) as {
        claim?: { listings?: number; saves?: number; messages?: number; alreadyClaimed?: boolean }
      }
      const claim = payload.claim
      await reloadBoard()
      if (!claim || claim.alreadyClaimed) return
      const moved = (claim.listings ?? 0) + (claim.saves ?? 0) + (claim.messages ?? 0)
      if (moved > 0) {
        toast.success("Your ads from this browser are now on your account")
      }
    } catch {
      // Claim is best-effort after sign-in; board reload still works.
    }
  }, [])

  const recordTermsAfterSignIn = useCallback(async () => {
    await recordPendingTermsAcceptance("signup")
  }, [])

  useEffect(() => {
    if (!user) return
    void (async () => {
      await claimBrowserSession()
      await recordTermsAfterSignIn()
    })()
  }, [user, claimBrowserSession, recordTermsAfterSignIn])

  const sendEmailCode = useCallback(
    async (email: string, next?: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const trimmed = email.trim().toLowerCase()
      if (!trimmed.includes("@")) return { ok: false as const, reason: "Enter a valid email address." }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: callbackRedirect(next),
        },
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      return { ok: true as const }
    },
    [configured],
  )

  const verifyEmailCode = useCallback(
    async (email: string, token: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: "email",
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      await claimBrowserSession()
      return { ok: true as const }
    },
    [configured, claimBrowserSession],
  )

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const trimmed = email.trim().toLowerCase()
      if (!trimmed.includes("@")) return { ok: false as const, reason: "Enter a valid email address." }
      if (!password) return { ok: false as const, reason: "Enter your password." }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      await claimBrowserSession()
      return { ok: true as const }
    },
    [configured, claimBrowserSession],
  )

  const signUpWithPassword = useCallback(
    async (email: string, password: string, next?: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const trimmed = email.trim().toLowerCase()
      if (!trimmed.includes("@")) return { ok: false as const, reason: "Enter a valid email address." }
      const reason = passwordError(password)
      if (reason) return { ok: false as const, reason }
      const supabase = createBrowserSupabase()
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: callbackRedirect(next) },
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      if (data.session) {
        await claimBrowserSession()
        return { ok: true as const, session: true }
      }
      return { ok: true as const, needsEmailConfirm: true }
    },
    [configured, claimBrowserSession],
  )

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const trimmed = email.trim().toLowerCase()
      if (!trimmed.includes("@")) return { ok: false as const, reason: "Enter a valid email address." }
      const supabase = createBrowserSupabase()
      // Default Supabase emails use ConfirmationURL → PKCE at /auth/callback.
      // Open the link on the same device that requested the reset.
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      return { ok: true as const }
    },
    [configured],
  )

  const requestPasswordReauth = useCallback(async () => {
    if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.reauthenticate()
    if (error) return { ok: false as const, reason: mapAuthError(error) }
    return { ok: true as const }
  }, [configured])

  const updatePassword = useCallback(
    async (password: string, nonce?: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const reason = passwordError(password)
      if (reason) return { ok: false as const, reason }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.updateUser(
        nonce ? { password, nonce } : { password },
      )
      if (error) {
        if (isReauthenticationRequired(error)) {
          const reauth = await supabase.auth.reauthenticate()
          if (reauth.error) {
            return { ok: false as const, reason: mapAuthError(reauth.error), needsReauth: true }
          }
          return {
            ok: false as const,
            reason: mapAuthError(error),
            needsReauth: true,
          }
        }
        return { ok: false as const, reason: mapAuthError(error) }
      }
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      return { ok: true as const }
    },
    [configured],
  )

  const updateEmail = useCallback(
    async (email: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      const trimmed = email.trim().toLowerCase()
      if (!trimmed.includes("@")) return { ok: false as const, reason: "Enter a valid email address." }
      if (trimmed === (user?.email ?? "").toLowerCase()) {
        return { ok: false as const, reason: "That is already your email." }
      }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: callbackRedirect("/account") },
      )
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      return { ok: true as const }
    },
    [configured, user?.email],
  )

  const signInWithGoogle = useCallback(
    async (next?: string) => {
      if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
      if (!googleEnabled) return { ok: false as const, reason: "Google sign-in is not enabled." }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackRedirect(next) },
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      return { ok: true as const }
    },
    [configured, googleEnabled],
  )

  const sendPhoneCode = useCallback(
    async (phone: string) => {
      if (!phoneEnabled) {
        return {
          ok: false as const,
          reason: "Phone sign-in needs an SMS provider on Supabase (for example Twilio).",
        }
      }
      const digits = phone.replace(/[^\d+]/g, "")
      if (digits.replace(/\D/g, "").length < 10) {
        return { ok: false as const, reason: "Enter a full phone number with country code." }
      }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        phone: digits,
        options: { shouldCreateUser: true },
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      return { ok: true as const }
    },
    [phoneEnabled],
  )

  const verifyPhoneCode = useCallback(
    async (phone: string, token: string) => {
      if (!phoneEnabled) {
        return { ok: false as const, reason: "Phone sign-in is not enabled." }
      }
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.replace(/[^\d+]/g, ""),
        token: token.trim(),
        type: "sms",
      })
      if (error) return { ok: false as const, reason: mapAuthError(error) }
      await claimBrowserSession()
      return { ok: true as const }
    },
    [phoneEnabled, claimBrowserSession],
  )

  const signOut = useCallback(async () => {
    if (!configured) return
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut({ scope: "local" })
    setUser(null)
    await reloadBoard()
    toast.success("Signed out")
  }, [configured])

  const signOutAll = useCallback(async () => {
    if (!configured) return
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut({ scope: "global" })
    setUser(null)
    await reloadBoard()
    toast.success("Signed out of all devices")
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured,
      phoneEnabled,
      googleEnabled,
      user,
      email: user?.email ?? user?.phone ?? null,
      pendingEmail: user?.new_email ?? null,
      signedIn: Boolean(user),
      sendEmailCode,
      verifyEmailCode,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      requestPasswordReauth,
      updateEmail,
      signInWithGoogle,
      sendPhoneCode,
      verifyPhoneCode,
      signOut,
      signOutAll,
      claimBrowserSession,
    }),
    [
      ready,
      configured,
      phoneEnabled,
      googleEnabled,
      user,
      sendEmailCode,
      verifyEmailCode,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      requestPasswordReauth,
      updateEmail,
      signInWithGoogle,
      sendPhoneCode,
      verifyPhoneCode,
      signOut,
      signOutAll,
      claimBrowserSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
