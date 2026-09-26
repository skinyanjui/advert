import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-neutral-500">That address is not on the board.</p>
      <Button asChild className="mt-5 rounded-full">
        <Link href="/">Back to listings</Link>
      </Button>
    </div>
  )
}
