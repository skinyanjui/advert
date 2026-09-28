"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

import { applySafeAuthNext, safeAuthNext } from "@/lib/auth-redirect"
import { createBrowserSupabase } from "@/lib/supabase/client"

/**
 * Handles default Supabase ConfirmationURL redirects (PKCE ?code=, query errors,
 * and legacy hash tokens/errors) for signup, magic link, recovery, and email_change.
 */
function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ran = useRef(false)
  const [message, setMessage] = useState("Signing you in…")

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const nextPath = safeAuthNext(searchParams.get("next"))
    const goingToReset = nextPath.startsWith("/auth/reset")

    function fail(kind: "device" | "link") {
      const target = new URL(goingToReset ? "/auth/reset" : "/sign-in", window.location.origin)
      target.searchParams.set("error", kind)
      target.searchParams.set("next", nextPath)
      router.replace(`${target.pathname}${target.search}`)
    }

    function succeed() {
      const target = new URL(window.location.origin)
      applySafeAuthNext(target, nextPath)
      target.searchParams.set("claimed", "1")
      router.replace(`${target.pathname}${target.search}${target.hash}`)
    }

    void (async () => {
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "",
      )
      const errorDescription =
        searchParams.get("error_description") ??
        searchParams.get("error") ??
        hashParams.get("error_description") ??
        hashParams.get("error")

      if (errorDescription) {
        setMessage("That link could not be completed.")
        fail(goingToReset ? "device" : "link")
        return
      }

      const code = searchParams.get("code")
      try {
        const supabase = createBrowserSupabase()
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setMessage("That link could not be completed.")
            fail("device")
            return
          }
          succeed()
          return
        }

        // Legacy / hash redirects: let the browser client absorb tokens from the URL.
        const { data, error } = await supabase.auth.getSession()
        if (!error && data.session) {
          succeed()
          return
        }
      } catch {
        // Fall through to failure.
      }

      setMessage("That link could not be completed.")
      fail(goingToReset ? "device" : "link")
    })()
  }, [router, searchParams])

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
