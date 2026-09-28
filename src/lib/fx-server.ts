import "server-only"

import { unstable_cache } from "next/cache"

import type { FxRates } from "@/lib/fx"

const FX_URL = "https://open.er-api.com/v6/latest/USD"
/** Cache exchange rates for 12 hours. */
const FX_REVALIDATE_SECONDS = 60 * 60 * 12

type OpenErApiResponse = {
  result?: string
  base_code?: string
  time_last_update_utc?: string
  rates?: Record<string, number>
}

async function fetchUsdRates(): Promise<FxRates | null> {
  try {
    const response = await fetch(FX_URL, {
      next: { revalidate: FX_REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return null
    const body = (await response.json()) as OpenErApiResponse
    if (body.result !== "success" || !body.rates || typeof body.rates !== "object") {
      return null
    }
    const rates: Record<string, number> = {}
    for (const [code, value] of Object.entries(body.rates)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        rates[code] = value
      }
    }
    if (!rates.USD) rates.USD = 1
    return {
      base: body.base_code === "USD" ? "USD" : "USD",
      rates,
      fetchedAt: body.time_last_update_utc ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export const getFxRates = unstable_cache(fetchUsdRates, ["fx-rates-usd-v1"], {
  revalidate: FX_REVALIDATE_SECONDS,
})
