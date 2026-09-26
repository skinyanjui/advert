"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { CityField, type ChosenPlace } from "@/components/city-field"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { categoryImage } from "@/lib/catalog"
import { resolvePlace } from "@/lib/cities"
import {
  canonicalCountry,
  countries,
  currencyLabel,
  getCountry,
} from "@/lib/countries"
import { useMarketplace } from "@/lib/marketplace"
import { categories, isCategoryId, type CategoryId, type Listing } from "@/lib/types"

const periods = [
  { id: "fixed", label: "Fixed price", suffix: undefined },
  { id: "month", label: "Per month", suffix: "/ month" },
  { id: "week", label: "Per week", suffix: "/ week" },
  { id: "day", label: "Per day", suffix: "/ day" },
  { id: "hour", label: "Per hour", suffix: "/ hour" },
] as const

type PeriodId = (typeof periods)[number]["id"]

const conditions = ["New", "Like new", "Used", "For sale", "For rent", "Service"]

type FieldErrors = Partial<Record<"title" | "price" | "city" | "description" | "phone" | "image", string>>

export function PostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startingCountry = canonicalCountry(searchParams.get("country")) ?? "KE"
  const startingCity = (searchParams.get("city") ?? "").trim().slice(0, 80)
  const { addListing } = useMarketplace()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<CategoryId>("vehicles")
  const [price, setPrice] = useState("")
  const [period, setPeriod] = useState<PeriodId>("fixed")
  const [condition, setCondition] = useState("Used")
  const [country, setCountry] = useState(startingCountry)
  const [currency, setCurrency] = useState(getCountry(startingCountry)?.currencies[0]?.code ?? "USD")
  const [city, setCity] = useState(startingCity)
  const [place, setPlace] = useState<ChosenPlace | null>(null)
  const [description, setDescription] = useState("")
  const [phone, setPhone] = useState("")
  const [meta, setMeta] = useState("")
  const [image, setImage] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const suffix = periods.find((item) => item.id === period)?.suffix
  const callingCode = getCountry(country)?.callingCode
  const currencies = currencyChoices(country)
  const countryOptions = [...countries].sort((a, b) => a.name.localeCompare(b.name))
  const preview = useMemo<Listing>(
    () => ({
      id: "preview",
      title: title.trim() || "Your listing title",
      price: Number(price) > 0 ? Number(price) : 0,
      currency,
      priceSuffix: suffix,
      category,
      country,
      city: city.trim() || "City",
      latitude: place?.lat,
      longitude: place?.lng,
      timezone: place?.timezone,
      hoursAgo: 0,
      postedAt: new Date().toISOString(),
      image: image ?? categoryImage[category],
      badge: category === "jobs" ? "jobs" : undefined,
      meta: meta.trim() || undefined,
      description,
      condition,
      sellerName: "Amina K.",
      sellerSince: "2024",
      phone: phone || callingCode || "+000",
      mine: true,
    }),
    [
      title,
      price,
      currency,
      suffix,
      category,
      country,
      city,
      place,
      image,
      meta,
      description,
      condition,
      phone,
      callingCode,
    ],
  )

  function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, image: "Choose a photo." }))
      return
    }
    if (file.size > 700_000) {
      setErrors((current) => ({ ...current, image: "Use a photo under 700KB." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result)
        setErrors((current) => ({ ...current, image: undefined }))
      }
    }
    reader.readAsDataURL(file)
  }

  function submit() {
    const nextErrors: FieldErrors = {}
    const amount = Number(price)
    if (title.trim().length < 4) nextErrors.title = "Add a title of at least 4 characters."
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.price = "Enter a price greater than zero."
    if (city.trim().length < 2) nextErrors.city = "Add the city."
    if (description.trim().length < 20) nextErrors.description = "Describe the ad in at least 20 characters."
    if (phone.replace(/[^\d]/g, "").length < 7) nextErrors.phone = "Add a phone number buyers can use."
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    const located = locatedPlace(place, country, city.trim())
    const listing: Listing = {
      ...preview,
      id: `ad-${Date.now()}`,
      title: title.trim(),
      price: Math.round(amount),
      currency,
      city: located?.name ?? city.trim(),
      latitude: located?.lat,
      longitude: located?.lng,
      timezone: located?.timezone,
      description: description.trim(),
      phone: phone.trim(),
      meta: meta.trim() || undefined,
      image: image ?? categoryImage[category],
    }
    const result = addListing(listing)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success("Your ad is live")
    router.push(`/listings/${listing.id}`)
  }

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post an ad</h1>
        <p className="mt-1 text-sm text-neutral-500">
          It shows up at the top of the board and stays in this browser.
        </p>
        <form
          className="mt-6 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <Field label="Photo" hint="Optional. A category photo is used if you skip this." error={errors.image}>
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => onFile(event.target.files?.[0])}
              className="h-10 cursor-pointer"
            />
          </Field>
          <Field label="Title" error={errors.title}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Toyota Corolla 2016, low mileage"
              className="h-10"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={category}
                onValueChange={(value) => {
                  if (isCategoryId(value)) {
                    setCategory(value)
                    if (value === "jobs") setPeriod("month")
                  }
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Condition">
              <Select value={condition} onValueChange={(value) => setCondition(value ?? "Used")}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label={`Price (${currency})`} error={errors.price}>
              <Input
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="450"
                className="h-10"
              />
            </Field>
            <Field label="Currency">
              <Select
                value={currency}
                onValueChange={(value) => {
                  if (value && currencies.includes(value)) setCurrency(value)
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} · {currencyLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Price period">
              <Select
                value={period}
                onValueChange={(value) => {
                  if (periods.some((item) => item.id === value)) setPeriod(value as PeriodId)
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Extra line" hint="Optional. Jobs often use Full-time or Part-time.">
            <Input
              value={meta}
              onChange={(event) => setMeta(event.target.value)}
              placeholder="Full-time"
              className="h-10"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Country">
              <Select
                value={country}
                onValueChange={(value) => {
                  const code = canonicalCountry(value)
                  if (!code) return
                  setCountry(code)
                  setCity("")
                  setPlace(null)
                  setCurrency(getCountry(code)?.currencies[0]?.code ?? "USD")
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City" error={errors.city} hint="Pick a GeoNames city, or search the map.">
              <CityField country={country} city={city} onCityChange={setCity} onPlace={setPlace} />
            </Field>
          </div>
          <Field label="Description" error={errors.description}>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="What is it, what condition is it in, and how can someone view it?"
            />
          </Field>
          <Field label="Phone" error={errors.phone} hint={callingCode ? `Calling code ${callingCode}.` : undefined}>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={callingCode ? `${callingCode} 7XX XXX XXX` : "+254 7XX XXX XXX"}
              className="h-10"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting} className="h-10 rounded-full px-5">
              Publish ad
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
      <aside className="hidden lg:block">
        <p className="mb-3 text-xs font-medium tracking-wide text-neutral-500 uppercase">Preview</p>
        <div className="sticky top-[85px]">
          <ListingCard listing={preview} linked={false} saveable={false} />
        </div>
      </aside>
    </div>
  )
}

function currencyChoices(countryCode: string): string[] {
  const local = getCountry(countryCode)?.currencies.map((item) => item.code) ?? []
  return local.includes("USD") ? local : [...local, "USD"]
}

function locatedPlace(chosen: ChosenPlace | null, country: string, city: string): ChosenPlace | null {
  if (chosen) return chosen
  const resolved = resolvePlace(country, city)
  if (!resolved.matched) return null
  return {
    name: resolved.name,
    lat: resolved.lat,
    lng: resolved.lng,
    timezone: resolved.timezone,
  }
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
    </div>
  )
}
