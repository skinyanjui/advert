"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { toast } from "sonner"

import { createBrowserSupabase } from "@/lib/supabase/client"
import { phoneAuthEnabled } from "@/lib/supabase/env"
import { reloadBoard } from "@/lib/marketplace"

function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  )
}

type AuthContextValue = {
  ready: boolean
  configured: boolean
  phoneEnabled: boolean
  user: User | null
  email: string | null
  signedIn: boolean
  sendEmailCode: (email: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  verifyEmailCode: (email: string, token: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  sendPhoneCode: (phone: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  verifyPhoneCode: (phone: string, token: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  signOut: () => Promise<void>
  claimBrowserSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = authConfigured()
  const phoneEnabled = phoneAuthEnabled()
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

  useEffect(() => {
    if (!user) return
    void claimBrowserSession()
  }, [user, claimBrowserSession])

  const sendEmailCode = useCallback(async (email: string) => {
    if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes("@")) return { ok: false as const, reason: "Enter a valid email address." }
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/account")}`,
      },
    })
    if (error) return { ok: false as const, reason: error.message }
    return { ok: true as const }
  }, [configured])

  const verifyEmailCode = useCallback(async (email: string, token: string) => {
    if (!configured) return { ok: false as const, reason: "Sign-in is not configured yet." }
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    })
    if (error) return { ok: false as const, reason: error.message }
    await claimBrowserSession()
    return { ok: true as const }
  }, [configured, claimBrowserSession])

  const sendPhoneCode = useCallback(async (phone: string) => {
    if (!phoneEnabled) {
      return {
        ok: false as const,
        reason: "Phone sign-in needs an SMS provider on Supabase (for example Twilio).",
      }
    }
    const digits = phone.replace(/[^\d+]/g, "")
    if (digits.replace(/\D/g, "").length < 10) return { ok: false as const, reason: "Enter a full phone number with country code." }
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      phone: digits,
      options: { shouldCreateUser: true },
    })
    if (error) return { ok: false as const, reason: error.message }
    return { ok: true as const }
  }, [phoneEnabled])

  const verifyPhoneCode = useCallback(async (phone: string, token: string) => {
    if (!phoneEnabled) {
      return { ok: false as const, reason: "Phone sign-in is not enabled." }
    }
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/[^\d+]/g, ""),
      token: token.trim(),
      type: "sms",
    })
    if (error) return { ok: false as const, reason: error.message }
    await claimBrowserSession()
    return { ok: true as const }
  }, [phoneEnabled, claimBrowserSession])

  const signOut = useCallback(async () => {
    if (!configured) return
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    setUser(null)
    await reloadBoard()
    toast.success("Signed out")
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured,
      phoneEnabled,
      user,
      email: user?.email ?? user?.phone ?? null,
      signedIn: Boolean(user),
      sendEmailCode,
      verifyEmailCode,
      sendPhoneCode,
      verifyPhoneCode,
      signOut,
      claimBrowserSession,
    }),
    [
      ready,
      configured,
      phoneEnabled,
      user,
      sendEmailCode,
      verifyEmailCode,
      sendPhoneCode,
      verifyPhoneCode,
      signOut,
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
