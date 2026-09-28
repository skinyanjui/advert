-- Seller accounts (Supabase Auth) for africa classifieds.
-- Apply manually on the connected Supabase project after review.
-- Do NOT run from the app. Secrets stay server-side.

-- Profiles for signed-in sellers.
create table if not exists public.board_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Records which anonymous board_session UUIDs have been claimed by an auth user,
-- so a later browser with the same cookie cannot re-steal already-migrated ads.
create table if not exists public.board_session_claims (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);
create index if not exists board_session_claims_user
  on public.board_session_claims (user_id);

alter table public.board_profiles enable row level security;
alter table public.board_session_claims enable row level security;

-- Keep anonymous clients off private tables. Authenticated clients may manage
-- only their own rows (defense in depth). The Next.js board API still uses the
-- server-only secret key for public board reads and photo uploads.
revoke all on public.board_profiles, public.board_session_claims from anon, authenticated;
revoke all on public.board_listings, public.board_saves, public.board_messages from anon, authenticated;

grant select on public.board_listings to anon, authenticated;
grant select, insert, update, delete on public.board_listings to authenticated;
grant select, insert, update, delete on public.board_saves to authenticated;
grant select, insert, update, delete on public.board_messages to authenticated;
grant select, insert, update, delete on public.board_profiles to authenticated;
-- Claims are written only with the service role from the claim API.
revoke all on public.board_session_claims from anon, authenticated;

drop policy if exists "Public can read listings" on public.board_listings;
create policy "Public can read listings"
  on public.board_listings for select to anon, authenticated
  using (true);

drop policy if exists "Owners insert listings" on public.board_listings;
create policy "Owners insert listings"
  on public.board_listings for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners update listings" on public.board_listings;
create policy "Owners update listings"
  on public.board_listings for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners delete listings" on public.board_listings;
create policy "Owners delete listings"
  on public.board_listings for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owners manage saves" on public.board_saves;
create policy "Owners manage saves"
  on public.board_saves for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners manage messages" on public.board_messages;
create policy "Owners manage messages"
  on public.board_messages for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners manage profile" on public.board_profiles;
create policy "Owners manage profile"
  on public.board_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Owner setup (Supabase Dashboard + Vercel) — do this after applying this SQL
-- ---------------------------------------------------------------------------
-- Prefer the Auth section in README.md for the current production suite (OTP,
-- magic link, optional password, /auth/callback, /auth/reset, HTML templates).
-- 1. Authentication → Providers → Email: enable Email. Confirm email on.
--    Optional password is supported in the app (min length 8).
-- 2. Authentication → URL configuration:
--      Site URL: https://adverts-murex.vercel.app  (and preview URLs as needed)
--      Redirect URLs include (wildcards as your plan allows):
--        https://adverts-murex.vercel.app/**
--        http://localhost:3000/**
--        https://*-skinyanjui.vercel.app/**
-- 3. Authentication → Email templates: paste HTML from supabase/templates/
--      (confirm-signup, magic-link, reset-password, change-email). Prefer
--      token_hash links to /auth/confirm (and recovery → /auth/reset).
-- 4. Phone / SMS OTP: leave off until an SMS provider is attached, then set
--      NEXT_PUBLIC_AUTH_PHONE=1. Google: configure provider, then
--      NEXT_PUBLIC_AUTH_GOOGLE=1.
-- 5. Vercel env (already used by the board; confirm publishable key is present):
--      NEXT_PUBLIC_SUPABASE_URL
--      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
--      SUPABASE_SECRET_KEY                   (server-only, never NEXT_PUBLIC_)
--      BOARD_SESSION_SECRET                  (optional but recommended)
--      ADMIN_EMAILS, CRON_SECRET, optional RESEND_* — see .env.example
-- 6. Redeploy after Auth URL / template changes so redirects match production.
