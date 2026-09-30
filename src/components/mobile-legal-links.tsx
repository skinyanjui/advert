import Link from "next/link"

/** Mobile-only legal links so Terms/Privacy are reachable without opening the category sheet. */
export function MobileLegalLinks() {
  return (
    <p className="md:hidden px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-2 text-center text-xs text-neutral-500">
      <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-800">
        Terms
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-800">
        Privacy
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href="/help" className="underline underline-offset-2 hover:text-neutral-800">
        Help
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href="/contact" className="underline underline-offset-2 hover:text-neutral-800">
        Contact us
      </Link>
    </p>
  )
}
