import { z } from "zod"

import { timeZoneSchema } from "@/lib/runtime-contracts"

export const referenceCountrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  alpha3: z.string().regex(/^[A-Z]{3}$/),
  numeric: z.string().regex(/^\d{3}$/),
  name: z.string().min(1),
  officialName: z.string().min(1),
  capital: z.string(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  subregion: z.string(),
  callingCode: z.string(),
  population: z.number().nonnegative(),
  currencies: z.array(z.object({ code: z.string().regex(/^[A-Z]{3}$/), name: z.string(), symbol: z.string() })),
  languages: z.array(z.object({ code: z.string().regex(/^[a-z]{2,3}$/), name: z.string() })),
  timezone: timeZoneSchema,
  primary: z.boolean(),
  primaryRank: z.number().int().nonnegative().optional(),
})
export const referenceCitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  country: z.string().regex(/^[A-Z]{2}$/),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  pop: z.number().int().min(15000),
  tz: timeZoneSchema,
})
export const referenceCityHitSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  timezone: timeZoneSchema,
})
