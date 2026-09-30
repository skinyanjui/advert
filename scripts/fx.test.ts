import assert from "node:assert/strict"
import { test } from "node:test"

import { boardCurrencyCodes, boardCurrencyOptions, convertAmount } from "../src/lib/fx"

test("board currencies are African-issued and include primary market codes", () => {
  const codes = boardCurrencyCodes()
  for (const code of ["USD", "EUR", "GBP", "CNY", "INR", "JPY", "ZWB"]) assert.equal(codes.includes(code), false)
  assert.ok(codes.includes("KES"))
  assert.ok(codes.includes("NGN"))
  assert.ok(codes.includes("ZAR"))
  assert.deepEqual(codes, [...codes].sort((a, b) => a.localeCompare(b)))
})

test("currency option labels do not repeat their ISO code", () => {
  for (const option of boardCurrencyOptions()) {
    assert.notEqual(option.label, option.code)
  }
})

test("convertAmount converts via USD base rates", () => {
  const rates = { USD: 1, KES: 130, EUR: 0.92 }
  assert.equal(convertAmount(130, "KES", "USD", rates), 1)
  assert.equal(convertAmount(1, "USD", "KES", rates), 130)
  const eur = convertAmount(130, "KES", "EUR", rates)
  assert.ok(eur !== null)
  assert.ok(Math.abs((eur as number) - 0.92) < 1e-9)
})

test("convertAmount returns null when a rate is missing", () => {
  assert.equal(convertAmount(100, "KES", "USD", { USD: 1 }), null)
  assert.equal(convertAmount(100, "USD", "XYZ", { USD: 1, KES: 130 }), null)
})

test("same currency conversion is a no-op", () => {
  assert.equal(convertAmount(50, "NGN", "NGN", {}), 50)
})
