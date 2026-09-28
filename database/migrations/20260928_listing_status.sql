-- Seller listing lifecycle: active | paused | sold | expired.
-- Reuses expires_at from 20260926_ad_expiry.sql. Apply manually after prior
-- board migrations. Do not run from the app.
-- Public/anon still have no table SELECT (see 20260926_lock_listings_reads.sql);
-- the Next.js service role enforces owner-only update/delete via owner_id checks.
-- Browse/search must only expose status = 'active' and non-expired rows.

alter table public.board_listings
  add column if not exists status text,
  add column if not exists sold_at timestamptz;

-- Backfill from payload.sold and expires_at before constraining.
update public.board_listings
set
  status = case
    when coalesce(payload->>'sold', '') in ('true', 't', '1') then 'sold'
    when expires_at is not null and expires_at <= now() then 'expired'
    else 'active'
  end,
  sold_at = case
    when coalesce(payload->>'sold', '') in ('true', 't', '1')
      then coalesce(sold_at, posted_at, now())
    else null
  end
where status is null;

update public.board_listings
set status = 'active'
where status is null;

alter table public.board_listings
  alter column status set default 'active';

do $$
begin
  alter table public.board_listings alter column status set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.board_listings
    drop constraint if exists board_listings_status_check;
  alter table public.board_listings
    add constraint board_listings_status_check
    check (status in ('active', 'paused', 'sold', 'expired'));
exception
  when others then null;
end $$;

-- Drop sold from JSON payload once mirrored on the column (idempotent).
update public.board_listings
set payload = payload - 'sold'
where payload ? 'sold';

create index if not exists board_listings_owner_status
  on public.board_listings (owner_id, status);

create index if not exists board_listings_public_active
  on public.board_listings (posted_at desc)
  where status = 'active' and hidden_at is null;

-- Keep client roles locked out of board_listings (no public/anon reads).
revoke all on table public.board_listings from anon, authenticated;
alter table public.board_listings enable row level security;

-- Owner: apply this SQL on the Supabase project before merge/deploy.
-- Verify: publishable key cannot select board_listings; service role can
-- update status/sold_at; app filters public browse to active + not expired.
