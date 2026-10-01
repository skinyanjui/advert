-- Reference tables are read-only to browser clients. Import with a server-side
-- service key; do not expose that key to the client.
create table if not exists public.reference_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  alpha3 text not null,
  numeric_code text,
  name text not null,
  official_name text not null,
  capital text not null,
  latitude double precision not null,
  longitude double precision not null,
  subregion text not null,
  calling_code text not null,
  population bigint not null,
  default_timezone text not null,
  primary_market boolean not null default false,
  source_payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.reference_cities (
  geoname_id bigint primary key,
  country_code text not null references public.reference_countries(code),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  population bigint not null check (population >= 15000),
  timezone text not null,
  updated_at timestamptz not null default now()
);
create index if not exists reference_cities_country_population
  on public.reference_cities (country_code, population desc);
create index if not exists reference_cities_country_name
  on public.reference_cities (country_code, lower(name));

create table if not exists public.reference_currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  symbol text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.reference_country_currencies (
  country_code text not null references public.reference_countries(code),
  currency_code text not null references public.reference_currencies(code),
  primary key (country_code, currency_code)
);
create index if not exists reference_country_currencies_currency_code
  on public.reference_country_currencies (currency_code);

create table if not exists public.reference_languages (
  code text primary key,
  name text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.reference_country_languages (
  country_code text not null references public.reference_countries(code),
  language_code text not null references public.reference_languages(code),
  primary key (country_code, language_code)
);
create index if not exists reference_country_languages_language_code
  on public.reference_country_languages (language_code);

create table if not exists public.reference_timezones (
  tzid text primary key,
  updated_at timestamptz not null default now()
);
create table if not exists public.reference_imports (
  id bigint generated always as identity primary key,
  source text not null,
  source_version text not null,
  record_count integer not null,
  source_url text,
  license text,
  content_hash text,
  generated_at timestamptz,
  imported_at timestamptz not null default now()
);

alter table public.reference_countries enable row level security;
alter table public.reference_cities enable row level security;
alter table public.reference_currencies enable row level security;
alter table public.reference_country_currencies enable row level security;
alter table public.reference_languages enable row level security;
alter table public.reference_country_languages enable row level security;
alter table public.reference_timezones enable row level security;
alter table public.reference_imports enable row level security;

grant select on public.reference_countries, public.reference_cities,
  public.reference_currencies, public.reference_country_currencies,
  public.reference_languages, public.reference_country_languages,
  public.reference_timezones to anon, authenticated;
revoke all on public.reference_imports from anon, authenticated;

create policy "Public country reference" on public.reference_countries for select to anon, authenticated using (true);
create policy "Public city reference" on public.reference_cities for select to anon, authenticated using (true);
create policy "Public currency reference" on public.reference_currencies for select to anon, authenticated using (true);
create policy "Public country currencies" on public.reference_country_currencies for select to anon, authenticated using (true);
create policy "Public language reference" on public.reference_languages for select to anon, authenticated using (true);
create policy "Public country languages" on public.reference_country_languages for select to anon, authenticated using (true);
create policy "Public timezone reference" on public.reference_timezones for select to anon, authenticated using (true);
