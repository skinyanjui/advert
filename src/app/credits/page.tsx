import type { Metadata } from "next"

export const metadata: Metadata = { title: "Credits" }

export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        Sample listing photos come from Unsplash, Pexels, and Wikimedia Commons. The Toyota HiAce photo is by Lawrence Ruiz and the diesel generator photo is by Biswarup Ganguly, both CC BY-SA via Wikimedia Commons.
      </p>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        Countries use an ISO 3166 snapshot, cities use GeoNames, time zones use IANA, and currency and language display names use Unicode CLDR. Maps use OpenStreetMap.
      </p>
    </div>
  )
}
