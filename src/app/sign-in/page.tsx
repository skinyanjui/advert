import type { Metadata } from "next"
import { Suspense } from "react"

import { SignInForm } from "@/components/sign-in-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function SignInPage() {
  return (
    <div className="w-full px-3 py-8 md:px-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in…</p>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
