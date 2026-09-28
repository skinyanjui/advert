import Link from "next/link"

import { cn } from "@/lib/utils"

export function TermsNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-neutral-500", className)}>
      Must follow our{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-800">
        Terms
      </Link>
      .
    </p>
  )
}
