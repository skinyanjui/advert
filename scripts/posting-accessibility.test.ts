import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("posting fields expose labels, descriptions, errors and focused validation summary", () => {
  const field = readFileSync(new URL("../src/components/form-field.tsx", import.meta.url), "utf8")
  const post = readFileSync(new URL("../src/components/post-form.tsx", import.meta.url), "utf8")
  const location = readFileSync(new URL("../src/components/posting/location-fields.tsx", import.meta.url), "utf8")
  const city = readFileSync(new URL("../src/components/city-field.tsx", import.meta.url), "utf8")

  assert.match(field, /useId/)
  assert.match(field, /htmlFor={controlId}/)
  assert.match(field, /aria-describedby/)
  assert.match(field, /aria-errormessage/)
  assert.match(field, /role="alert"/)

  assert.match(post, /errorSummaryRef/)
  assert.match(post, /aria-live="assertive"/)
  assert.match(post, /summary\.focus\(\)/)
  assert.match(post, /<fieldset/)
  assert.match(post, /<legend/)
  assert.match(post, /\(controlProps\) => <Input/)
  assert.match(post, /\(controlProps\) => <Textarea/)

  assert.match(location, /CountryField {\.\.\.controlProps}/)
  assert.match(location, /CityField {\.\.\.controlProps}/)
  assert.match(location, /<Input\s+{\.\.\.controlProps}/)
  assert.match(city, /id={id}/)
})
