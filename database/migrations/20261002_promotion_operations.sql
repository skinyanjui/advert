-- Apply after 20261002_featured_promotions.sql. Operational emails contain no
-- recipient snapshot; resolve the current verified account email at delivery.
begin;
alter table public.board_promotions
  add column if not exists checkout_language text check(checkout_language in ('en','fr','sw')),
  add column if not exists paid_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists refund_attempts integer not null default 0,
  add column if not exists refund_last_error text,
  add column if not exists refund_next_attempt_at timestamptz,
  add column if not exists refund_lease uuid,
  add column if not exists refund_lease_until timestamptz;
-- Historical payment time is unknown. Give existing paid requests a fresh target.
update public.board_promotions set review_due_at = now() + interval '24 hours'
where status = 'pending' and review_due_at is null;
create index if not exists board_promotions_review_due on public.board_promotions(review_due_at) where status = 'pending';
create table if not exists public.board_promotion_notifications (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.board_promotions(id) on delete cascade,
  owner_id uuid not null,
  audience text not null check (audience in ('seller','admin')),
  kind text not null check (kind in ('payment_received','approved','rejected','removed','granted','refunded','refund_failed','review_overdue')),
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease uuid,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists board_promotion_notifications_queue on public.board_promotion_notifications(status,next_attempt_at);
alter table public.board_promotion_notifications enable row level security;
revoke all on public.board_promotion_notifications from public,anon,authenticated;
grant all on public.board_promotion_notifications to service_role;

create or replace function public.prepare_board_promotion_operations()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.paid and not old.paid then
    new.paid_at = now();
    new.review_due_at = now() + interval '24 hours';
  end if;
  if new.status = 'refund_pending' and old.status <> new.status then
    new.refund_next_attempt_at = now();
  elsif new.status = 'refunded' then
    new.refund_last_error = null;
    new.refund_next_attempt_at = null;
    new.refund_lease = null;
    new.refund_lease_until = null;
  end if;
  return new;
end $$;
drop trigger if exists prepare_board_promotion_operations on public.board_promotions;
create trigger prepare_board_promotion_operations before update on public.board_promotions
for each row execute function public.prepare_board_promotion_operations();

create or replace function public.notify_board_promotion_operations()
returns trigger language plpgsql set search_path = public as $$
declare event_kind text; old_status text;
begin
  old_status = case when tg_op = 'INSERT' then null else old.status end;
  if new.status is distinct from old_status then
    event_kind = case
      when new.status = 'pending' then 'payment_received'
      when new.status = 'active' and new.paid then 'approved'
      when new.status = 'active' then 'granted'
      when new.status = 'refund_pending' and old_status = 'pending' then 'rejected'
      when new.status in ('refund_pending','revoked') then 'removed'
      when new.status = 'refunded' then 'refunded' else null end;
    if event_kind is not null then
      insert into public.board_promotion_notifications(promotion_id,owner_id,audience,kind,dedupe_key,payload)
      values(new.id,new.owner_id,'seller',event_kind,new.id || ':' || event_kind,
        jsonb_build_object('listing_id',new.listing_id,'reason',new.decision_reason,'review_due_at',new.review_due_at,'ends_at',new.ends_at))
      on conflict (dedupe_key) do nothing;
    end if;
  end if;
  if new.refund_last_error is not null and (tg_op = 'INSERT' or old.refund_last_error is distinct from new.refund_last_error or old.refund_attempts <> new.refund_attempts) then
    insert into public.board_promotion_notifications(promotion_id,owner_id,audience,kind,dedupe_key,payload)
    values(new.id,new.owner_id,'admin','refund_failed',new.id || ':refund_failed:' || new.refund_attempts,
      jsonb_build_object('listing_id',new.listing_id,'attempts',new.refund_attempts))
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists notify_board_promotion_operations on public.board_promotions;
create trigger notify_board_promotion_operations after insert or update on public.board_promotions
for each row execute function public.notify_board_promotion_operations();

create or replace function public.sweep_board_promotion_operations()
returns void language plpgsql set search_path = public as $$
begin
  -- A pending provider refund or a worker crash must not silently exhaust retries.
  update public.board_promotions set refund_last_error = 'Automatic refund checks exhausted. Review the pending refund in Stripe.',
    refund_lease = null, refund_lease_until = null
  where status = 'refund_pending' and refund_attempts >= 3 and refund_last_error is null
    and (refund_lease_until is null or refund_lease_until <= now());
  insert into public.board_promotion_notifications(promotion_id,owner_id,audience,kind,dedupe_key,payload)
  select id,owner_id,'admin','review_overdue',id || ':review_overdue',jsonb_build_object('listing_id',listing_id,'review_due_at',review_due_at)
  from public.board_promotions where status = 'pending' and review_due_at <= now()
  on conflict (dedupe_key) do nothing;
  update public.board_promotion_notifications set status = 'failed',last_error = 'Delivery retry limit reached',lease = null,lease_until = null
  where status = 'processing' and lease_until <= now() and attempts >= 5;
  -- Retain operational notices for the same 90-day window as promotion analytics.
  delete from public.board_promotion_notifications where created_at < now() - interval '90 days' and status in ('sent','failed');
end $$;

create or replace function public.claim_board_promotion_notifications(p_limit integer default 10)
returns setof public.board_promotion_notifications language plpgsql set search_path = public as $$
begin
  return query with candidates as (
    select id from public.board_promotion_notifications
    where ((status = 'pending' and next_attempt_at <= now()) or (status = 'processing' and lease_until <= now())) and attempts < 5
    order by created_at for update skip locked limit greatest(1,least(p_limit,25))
  ) update public.board_promotion_notifications n set status = 'processing', attempts = attempts + 1,
    lease = gen_random_uuid(),lease_until = now() + interval '10 minutes'
    from candidates c where n.id = c.id returning n.*;
end $$;
create or replace function public.complete_board_promotion_notification(p_id uuid,p_lease uuid,p_delivered boolean,p_error text default null)
returns void language plpgsql set search_path = public as $$
begin
  update public.board_promotion_notifications set
    status = case when p_delivered then 'sent' when attempts >= 5 then 'failed' else 'pending' end,
    delivered_at = case when p_delivered then now() else null end,
    last_error = case when p_delivered then null else left(p_error,200) end,
    next_attempt_at = now() + make_interval(mins => 5 * power(2,least(attempts,5))::integer),
    lease = null,lease_until = null
  where id = p_id and lease = p_lease and status = 'processing';
end $$;
create or replace function public.claim_board_promotion_refund(p_id uuid,p_manual boolean default false)
returns setof public.board_promotions language plpgsql set search_path = public as $$
begin
  return query update public.board_promotions set refund_attempts = refund_attempts + 1,
    refund_lease = gen_random_uuid(),refund_lease_until = now() + interval '10 minutes'
  where id = p_id and status = 'refund_pending' and (refund_lease_until is null or refund_lease_until <= now())
    and (p_manual or (refund_attempts < 3 and coalesce(refund_next_attempt_at,now()) <= now())) returning *;
end $$;
create or replace function public.complete_board_promotion_refund_attempt(p_id uuid,p_lease uuid,p_refund text,p_error text)
returns void language plpgsql set search_path = public as $$
begin
  update public.board_promotions set stripe_refund_id = coalesce(p_refund,stripe_refund_id),
    refund_last_error = case when p_error is null and refund_attempts >= 3 then 'Automatic refund checks exhausted. Review the pending refund in Stripe.' else left(p_error,200) end,
    refund_lease = null,refund_lease_until = null,
    refund_next_attempt_at = case when refund_attempts < 3 then now() + make_interval(mins => 15 * power(2,refund_attempts)::integer) else null end
  where id = p_id and status = 'refund_pending' and refund_lease = p_lease;
end $$;
create or replace function public.fail_board_promotion_refund(p_intent text,p_refund text)
returns void language plpgsql set search_path = public as $$
begin
  update public.board_promotions set refund_last_error = 'Stripe reported a failed or cancelled refund. Review and retry.',
    refund_next_attempt_at = case when refund_attempts < 3 then now() + interval '30 minutes' else null end
  where stripe_payment_intent = p_intent and stripe_refund_id = p_refund and status = 'refund_pending';
end $$;
create or replace function public.board_promotion_operations_ready()
returns boolean language sql stable set search_path = public as $$ select true $$;
-- Freeze checkout copy before the provider request: changing UI language during
-- an uncertain retry must not change the body for the same Stripe idempotency key.
create or replace function public.resolve_board_promotion_checkout_language(p_id uuid,p_owner uuid,p_language text)
returns text language plpgsql set search_path = public as $$
declare chosen text;
begin
  if p_language is null or p_language not in ('en','fr','sw') then raise exception 'Invalid checkout language.'; end if;
  update public.board_promotions set checkout_language=coalesce(checkout_language,p_language)
    where id=p_id and owner_id=p_owner returning checkout_language into chosen;
  if not found then raise exception 'Promotion not owned.'; end if;
  return chosen;
end $$;
revoke all on function public.resolve_board_promotion_checkout_language(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_board_promotion_checkout_language(uuid,uuid,text) to service_role;
revoke all on function public.prepare_board_promotion_operations(),public.notify_board_promotion_operations(),public.sweep_board_promotion_operations(),
 public.claim_board_promotion_notifications(integer),public.complete_board_promotion_notification(uuid,uuid,boolean,text),
 public.claim_board_promotion_refund(uuid,boolean),public.complete_board_promotion_refund_attempt(uuid,uuid,text,text),public.fail_board_promotion_refund(text,text),public.board_promotion_operations_ready()
 from public,anon,authenticated;
grant execute on function public.prepare_board_promotion_operations(),public.notify_board_promotion_operations(),public.sweep_board_promotion_operations(),
 public.claim_board_promotion_notifications(integer),public.complete_board_promotion_notification(uuid,uuid,boolean,text),
 public.claim_board_promotion_refund(uuid,boolean),public.complete_board_promotion_refund_attempt(uuid,uuid,text,text),public.fail_board_promotion_refund(text,text),public.board_promotion_operations_ready()
 to service_role;
commit;
