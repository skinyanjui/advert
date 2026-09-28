import "server-only"

import { unstable_cache } from "next/cache"

import type { FxRates } from "@/lib/fx"

const FX_URL = "https://open.er-api.com/v6/latest/USD"
/** Cache successful exchange rates for 12 hours. Failures are not cached. */
const FX_REVALIDATE_SECONDS = 60 * 60 * 12

type OpenErApiResponse = {
  result?: string
  base_code?: string
  time_last_update_utc?: string
  rates?: Record<string, number>
}

async function fetchUsdRates(): Promise<FxRates> {
  const response = await fetch(FX_URL, {
    next: { revalidate: FX_REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Exchange rate upstream returned ${response.status}`)
  }
  const body = (await response.json()) as OpenErApiResponse
  if (body.result !== "success" || !body.rates || typeof body.rates !== "object") {
    throw new Error("Exchange rate upstream returned an invalid payload")
  }
  const rates: Record<string, number> = {}
  for (const [code, value] of Object.entries(body.rates)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      rates[code] = value
    }
  }
  if (!rates.USD) rates.USD = 1
  return {
    base: "USD",
    rates,
    fetchedAt: body.time_last_update_utc ?? new Date().toISOString(),
  }
}

/** Cached only on success — thrown errors skip the cache so the next request retries. */
export const getFxRates = unstable_cache(fetchUsdRates, ["fx-rates-usd-v2"], {
  revalidate: FX_REVALIDATE_SECONDS,
})
