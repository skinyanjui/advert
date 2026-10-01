import type { Metadata } from "next"
import { referenceSources } from "@/lib/reference-manifest"

export const metadata: Metadata = { title: "Sources" }

export default function CreditsPage() {
  return (
    <div className="w-full px-3 py-8 md:px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Photo, map, and reference-data attribution for this board.
      </p>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        Sample listing photos come from Unsplash, Pexels, and Wikimedia Commons. The Toyota HiAce photo is by Lawrence Ruiz and the diesel generator photo is by Biswarup Ganguly, both CC BY-SA via Wikimedia Commons.
      </p>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        Countries use an ISO 3166 snapshot, cities use GeoNames, time zones use IANA, and currency and language display names use Unicode CLDR. Maps use OpenStreetMap.
      </p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-neutral-700">
        {Object.values(referenceSources).map((source) => (
          <li key={source.source}>
            <a href={source.sourceUrl} className="underline underline-offset-2">{source.source}</a>
            {" "}— {source.license}.
          </li>
        ))}
        <li><a href="https://www.openstreetmap.org/copyright" className="underline underline-offset-2">OpenStreetMap contributors</a>{" "}— map data licensed under ODbL.</li>
      </ul>
    </div>
  )
}
