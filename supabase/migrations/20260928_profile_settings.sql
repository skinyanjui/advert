-- Profile settings: location + avatar on board_profiles, avatars storage bucket.
-- Apply manually on the connected Supabase project after review.
-- Do NOT run from the app. board_profiles stays service-role-only (same as
-- database/migrations/20260926_lock_listings_reads.sql). The Next.js profile
-- API uses the server-only secret key.

-- ---------------------------------------------------------------------------
-- board_profiles columns
-- ---------------------------------------------------------------------------
alter table public.board_profiles
  add column if not exists avatar_url text,
  add column if not exists city text,
  add column if not exists country_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_country_code_check'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_country_code_check
      check (country_code is null or country_code ~ '^[A-Z]{2}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_display_name_len'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_display_name_len
      check (display_name is null or char_length(display_name) between 1 and 80);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_profiles_city_len'
  ) then
    alter table public.board_profiles
      add constraint board_profiles_city_len
      check (city is null or char_length(city) between 1 and 80);
  end if;
end $$;

-- Keep profiles off browser clients (service role only).
drop policy if exists "Owners manage profile" on public.board_profiles;
revoke all on table public.board_profiles from anon, authenticated;
alter table public.board_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Avatars bucket (public object URLs; owner-only write under {user_id}/…)
-- No SELECT policy: a public bucket already serves objects by URL, and a
-- broad SELECT policy would allow listing every avatar path / user id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1500000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 1500000,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar public read" on storage.objects;

drop policy if exists "Avatar owner insert" on storage.objects;
create policy "Avatar owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatar owner update" on storage.objects;
create policy "Avatar owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatar owner delete" on storage.objects;
create policy "Avatar owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
