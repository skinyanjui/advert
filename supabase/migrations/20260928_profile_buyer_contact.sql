-- Saved buyer contact phone on board_profiles (call + WhatsApp; same channel as listings).
-- Apply manually on the connected Supabase project after review.
-- Do NOT run from the app. board_profiles stays service-role-only (same as
-- database/migrations/20260926_lock_listings_reads.sql). The Next.js profile
-- API uses the server-only secret key. No new policies; no grants to
-- anon/authenticated. Phone is never selected for public seller overlays.

-- ---------------------------------------------------------------------------
-- board_profiles.phone
-- ---------------------------------------------------------------------------
alter table public.board_profiles
  add column if not exists phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_phone_len'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_phone_len
      check (phone is null or char_length(phone) between 1 and 30);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_phone_digits'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_phone_digits
      check (
        phone is null
        or (
          length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15
        )
      );
  end if;
end $$;

-- Keep profiles off browser clients (service role only).
revoke all on table public.board_profiles from anon, authenticated;
alter table public.board_profiles enable row level security;
