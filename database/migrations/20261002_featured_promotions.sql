-- Apply manually after existing board migrations, before deploying featured code.
-- All writes and RPCs are server-only. Stripe payment does not itself grant ranking.
begin;
alter table public.board_listings
  add column if not exists featured boolean not null default false,
  add column if not exists featured_until timestamptz,
  add column if not exists featured_paid boolean not null default false,
  add column if not exists featured_promotion_id uuid;

create table if not exists public.board_promotions (
  id uuid primary key default gen_random_uuid(),
  -- Keep payment history even if the seller deletes the listing.
  listing_id text not null,
  owner_id uuid not null,
  status text not null check (status in ('awaiting_payment','pending','active','refund_pending','refunded','revoked','expired','cancelled')),
  paid boolean not null default false,
  amount integer not null check (amount >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  duration_days integer not null check (duration_days between 1 and 30),
  stripe_session_id text unique,
  stripe_payment_intent text unique,
  stripe_refund_id text unique,
  created_at timestamptz not null default now(),
  checkout_terms_version text not null default '2026-10-02-v1',
  checkout_terms_accepted_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz,
  decided_by uuid,
  decision_reason text,
  check (ends_at is null or ends_at > starts_at)
);
create unique index if not exists board_promotions_one_open_listing
  on public.board_promotions(listing_id) where status in ('awaiting_payment','pending','active','refund_pending');
create index if not exists board_promotions_owner on public.board_promotions(owner_id, created_at desc);
create index if not exists board_promotions_queue on public.board_promotions(status, created_at);
create index if not exists board_listings_featured on public.board_listings(featured_until) where featured;

create table if not exists public.board_promotion_decisions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.board_promotions(id),
  action text not null check (action in ('approve','reject','remove','grant')),
  actor_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists board_promotion_decisions_history on public.board_promotion_decisions(promotion_id, created_at);
alter table public.board_promotion_decisions enable row level security;
revoke all on public.board_promotion_decisions from public, anon, authenticated;
grant select, insert on public.board_promotion_decisions to service_role;

create table if not exists public.board_promotion_events (
  promotion_id uuid not null references public.board_promotions(id) on delete cascade,
  event_type text not null check (event_type in ('impression','click')),
  actor_hash text not null,
  event_day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (promotion_id, event_type, actor_hash, event_day)
);
alter table public.board_promotions enable row level security;
alter table public.board_promotion_events enable row level security;
revoke all on public.board_promotions, public.board_promotion_events from public, anon, authenticated;
grant all on public.board_promotions, public.board_promotion_events to service_role;

-- Lock the listing to serialize requests, grants, expiry, approval and refunds.
create or replace function public.request_board_promotion(p_listing text, p_owner uuid)
returns public.board_promotions language plpgsql set search_path = public as $$
declare l public.board_listings; r public.board_promotions;
begin
  select * into l from public.board_listings where id = p_listing and owner_id = p_owner for update;
  if not found then raise exception 'Listing not owned by this account'; end if;
  if l.hidden_at is not null or l.status <> 'active' or l.expires_at is null or l.expires_at <= now() + interval '7 days' then
    raise exception 'Use an active listing with at least seven days remaining';
  end if;
  if l.featured and l.featured_until > now() then raise exception 'This listing is already featured'; end if;
  update public.board_promotions set status = 'expired' where listing_id = p_listing and status = 'active' and ends_at <= now();
  select * into r from public.board_promotions where listing_id = p_listing and status in ('awaiting_payment','pending','active','refund_pending');
  if found then
    if r.owner_id <> p_owner or r.status <> 'awaiting_payment' then raise exception 'This listing already has a promotion in progress'; end if;
    return r;
  end if;
  insert into public.board_promotions(listing_id, owner_id, status, amount, duration_days)
  values (p_listing, p_owner, 'awaiting_payment', 1000, 7) returning * into r;
  return r;
end $$;

create or replace function public.bind_board_promotion_checkout(p_id uuid, p_session text)
returns void language plpgsql set search_path = public as $$
begin
  update public.board_promotions set stripe_session_id = p_session
  where id = p_id and status = 'awaiting_payment' and (stripe_session_id is null or stripe_session_id = p_session);
  if not found then raise exception 'Checkout request changed'; end if;
end $$;

create or replace function public.cancel_board_promotion_checkout(p_id uuid, p_session text)
returns void language plpgsql set search_path = public as $$
begin
  update public.board_promotions set status = 'cancelled', stripe_session_id = p_session
    where id = p_id and status = 'awaiting_payment' and (stripe_session_id is null or stripe_session_id = p_session);
end $$;

create or replace function public.pay_board_promotion(p_id uuid, p_session text, p_intent text, p_amount integer, p_currency text, p_refunded boolean default false)
returns void language plpgsql set search_path = public as $$
declare r public.board_promotions;
begin
  perform 1 from public.board_listings where id = (select listing_id from public.board_promotions where id = p_id) for update;
  select * into r from public.board_promotions where id = p_id for update;
  if not found or p_session is null or p_intent is null or (r.stripe_session_id is not null and r.stripe_session_id <> p_session) or r.amount <> p_amount or r.currency <> p_currency then
    raise exception 'Payment does not match checkout';
  end if;
  if r.paid then
    if r.stripe_payment_intent <> p_intent then raise exception 'Payment intent mismatch'; end if;
    if p_refunded then
      update public.board_promotions set status = 'refunded' where id = p_id;
      update public.board_listings set featured = false, featured_paid = false, featured_until = null, featured_promotion_id = null
        where id = r.listing_id and featured_promotion_id = r.id;
    end if;
    return;
  end if;
  if r.status not in ('awaiting_payment','cancelled') then raise exception 'Checkout is not payable'; end if;
  -- Signed, provider-verified payment recovers a session whose binding response was lost.
  update public.board_promotions set stripe_session_id = p_session, status = case when p_refunded then 'refunded' else 'pending' end, paid = true, stripe_payment_intent = p_intent where id = p_id;
end $$;

create or replace function public.decide_board_promotion(p_id uuid, p_actor uuid, p_action text, p_reason text)
returns public.board_promotions language plpgsql set search_path = public as $$
declare r public.board_promotions; l public.board_listings;
begin
  -- Consistent lock order: listing first, promotion second.
  select * into l from public.board_listings where id = (select listing_id from public.board_promotions where id = p_id) for update;
  select * into r from public.board_promotions where id = p_id for update;
  if not found then raise exception 'Promotion not found'; end if;
  if length(trim(p_reason)) < 3 or length(p_reason) > 1500 then raise exception 'Add a decision reason'; end if;
  if p_action = 'approve' then
    if r.status = 'active' then return r; end if;
    if r.status <> 'pending' or not r.paid then raise exception 'Payment must be confirmed before approval'; end if;
    if l.hidden_at is not null or l.status <> 'active' or l.owner_id <> r.owner_id or l.expires_at is null or l.expires_at <= now() + make_interval(days => r.duration_days) then
      raise exception 'Listing must be active with the full promotion duration remaining; reject and refund otherwise';
    end if;
    update public.board_promotions set status = 'active', starts_at = now(), ends_at = now() + make_interval(days => r.duration_days),
      decided_by = p_actor, decision_reason = p_reason where id = p_id returning * into r;
    update public.board_listings set featured = true, featured_until = r.ends_at, featured_paid = true, featured_promotion_id = r.id where id = r.listing_id;
  elsif p_action = 'reject' then
    if r.status in ('refunded','refund_pending') then return r; end if;
    if r.status <> 'pending' or not r.paid then raise exception 'Only a paid pending request can be rejected'; end if;
    update public.board_promotions set status = 'refund_pending', decided_by = p_actor, decision_reason = p_reason where id = p_id returning * into r;
  elsif p_action = 'remove' then
    if r.status in ('refunded', 'refund_pending') then return r; end if;
    if r.status = 'revoked' then return r; end if;
    if r.status <> 'active' then raise exception 'Only an active promotion can be removed'; end if;
    -- Refund paid promotions when removing them; complementary grants have no charge.
    update public.board_promotions set status = case when paid then 'refund_pending' else 'revoked' end,
      decided_by = p_actor, decision_reason = p_reason where id = p_id returning * into r;
    update public.board_listings set featured = false, featured_paid = false, featured_until = null, featured_promotion_id = null
      where id = r.listing_id and featured_promotion_id = r.id;
  else raise exception 'Unknown decision'; end if;
  insert into public.board_promotion_decisions(promotion_id, action, actor_id, reason) values(r.id, p_action, p_actor, p_reason);
  return r;
end $$;

create or replace function public.grant_board_promotion(p_listing text, p_actor uuid, p_days integer, p_reason text)
returns public.board_promotions language plpgsql set search_path = public as $$
declare l public.board_listings; r public.board_promotions;
begin
  if p_days not between 1 and 30 or length(trim(p_reason)) < 3 or length(p_reason) > 1500 then raise exception 'Use 1–30 days and a decision reason'; end if;
  select * into l from public.board_listings where id = p_listing for update;
  if not found then raise exception 'Listing not found'; end if;
  if l.hidden_at is not null or l.status <> 'active' or l.expires_at is null or l.expires_at <= now() + make_interval(days => p_days) then raise exception 'Listing must remain active for the full grant'; end if;
  update public.board_promotions set status = 'expired' where listing_id = p_listing and status = 'active' and ends_at <= now();
  insert into public.board_promotions(listing_id, owner_id, status, amount, duration_days, starts_at, ends_at, decided_by, decision_reason)
  values(p_listing, l.owner_id, 'active', 0, p_days, now(), now() + make_interval(days => p_days), p_actor, p_reason) returning * into r;
  update public.board_listings set featured = true, featured_paid = false, featured_until = r.ends_at, featured_promotion_id = r.id where id = p_listing;
  insert into public.board_promotion_decisions(promotion_id, action, actor_id, reason) values(r.id, 'grant', p_actor, p_reason);
  return r;
end $$;

create or replace function public.expire_board_promotions()
returns integer language plpgsql set search_path = public as $$
declare n integer;
begin
  update public.board_listings set featured = false, featured_paid = false, featured_promotion_id = null
    where featured and featured_until <= now();
  update public.board_promotions set status = 'expired' where status = 'active' and ends_at <= now();
  get diagnostics n = row_count;
  delete from public.board_promotion_events where created_at < now() - interval '90 days';
  return n;
end $$;

create or replace function public.refund_board_promotion(p_intent text, p_refund text)
returns void language plpgsql set search_path = public as $$
declare r public.board_promotions;
begin
  select * into r from public.board_promotions where stripe_payment_intent = p_intent;
  if not found then return; end if;
  perform 1 from public.board_listings where id = r.listing_id for update;
  select * into r from public.board_promotions where id = r.id for update;
  update public.board_promotions set status = 'refunded', stripe_refund_id = coalesce(p_refund, stripe_refund_id) where id = r.id;
  update public.board_listings set featured = false, featured_paid = false, featured_until = null, featured_promotion_id = null
    where id = r.listing_id and featured_promotion_id = r.id;
end $$;

create or replace function public.record_board_promotion_event(p_id uuid, p_event text, p_actor uuid, p_hash text)
returns void language plpgsql set search_path = public as $$
begin
  insert into public.board_promotion_events(promotion_id, event_type, actor_hash)
  select r.id, p_event, p_hash from public.board_promotions r join public.board_listings l on l.id = r.listing_id
  where r.id = p_id and r.status = 'active' and r.ends_at > now() and r.owner_id <> p_actor
    and l.featured_promotion_id = r.id and l.featured and l.featured_until > now()
    and l.status = 'active' and l.hidden_at is null and l.expires_at > now()
  on conflict do nothing;
end $$;

-- Functions are invoker-security; never callable with public/authenticated keys.
revoke all on function public.request_board_promotion(text,uuid), public.bind_board_promotion_checkout(uuid,text),
 public.cancel_board_promotion_checkout(uuid,text), public.pay_board_promotion(uuid,text,text,integer,text,boolean), public.decide_board_promotion(uuid,uuid,text,text),
 public.grant_board_promotion(text,uuid,integer,text), public.expire_board_promotions(),
 public.refund_board_promotion(text,text), public.record_board_promotion_event(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.request_board_promotion(text,uuid), public.bind_board_promotion_checkout(uuid,text),
 public.cancel_board_promotion_checkout(uuid,text), public.pay_board_promotion(uuid,text,text,integer,text,boolean), public.decide_board_promotion(uuid,uuid,text,text),
 public.grant_board_promotion(text,uuid,integer,text), public.expire_board_promotions(),
 public.refund_board_promotion(text,text), public.record_board_promotion_event(uuid,text,uuid,text) to service_role;
create or replace function public.board_promotion_stats(p_ids uuid[])
returns table(promotion_id uuid, impressions bigint, clicks bigint)
language sql stable set search_path = public as $$
  select promotion_id, count(*) filter (where event_type = 'impression'), count(*) filter (where event_type = 'click')
  from public.board_promotion_events where promotion_id = any(p_ids) group by promotion_id;
$$;
revoke all on function public.board_promotion_stats(uuid[]) from public, anon, authenticated;
grant execute on function public.board_promotion_stats(uuid[]) to service_role;
commit;
