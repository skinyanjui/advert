-- Profile settings: location + avatar on board_profiles, avatars storage bucket.
-- Apply manually on the connected Supabase project after review.
-- Do NOT run from the app. The Next.js profile API still uses the service-role key;
-- owner RLS below is defense in depth if a user JWT ever reaches these tables.

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

-- Owners may manage only their own profile row (publishable key cannot reach
-- other users). Anon stays revoked. Service role continues to bypass RLS.
grant select, insert, update, delete on public.board_profiles to authenticated;

drop policy if exists "Owners manage profile" on public.board_profiles;
create policy "Owners manage profile"
  on public.board_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Avatars bucket (public read; owner-only write under {user_id}/…)
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
create policy "Avatar public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

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
