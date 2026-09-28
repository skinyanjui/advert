-- Language and currency preferences on board_profiles.
-- Apply manually on the connected Supabase project AFTER review and BEFORE merge.
-- Do NOT run from the app. board_profiles stays service-role-only (same as
-- database/migrations/20260926_lock_listings_reads.sql and
-- supabase/migrations/20260928_profile_buyer_contact.sql). The Next.js profile
-- API uses the server-only secret key. No new policies; no grants to
-- anon/authenticated.

-- ---------------------------------------------------------------------------
-- board_profiles.language / board_profiles.currency
-- ---------------------------------------------------------------------------
alter table public.board_profiles
  add column if not exists language text,
  add column if not exists currency text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_language_check'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_language_check
      check (language is null or language in ('en', 'fr', 'sw'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_currency_check'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_currency_check
      check (
        currency is null
        or currency = 'listing'
        or currency ~ '^[A-Z]{3}$'
      );
  end if;
end $$;

-- Keep profiles off browser clients (service role only).
revoke all on table public.board_profiles from anon, authenticated;
alter table public.board_profiles enable row level security;
