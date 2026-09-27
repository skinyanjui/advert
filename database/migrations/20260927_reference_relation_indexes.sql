-- Cover foreign keys from the country relationship tables to their reference codes.
-- Existing primary keys start with country_code, so they do not serve lookups by currency or language.
create index if not exists reference_country_currencies_currency_code
  on public.reference_country_currencies (currency_code);
create index if not exists reference_country_languages_language_code
  on public.reference_country_languages (language_code);
