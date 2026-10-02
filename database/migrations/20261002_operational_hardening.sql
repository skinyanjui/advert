-- Source reconciliation for the operational_hardening migration applied to the advert project.
-- Durable account deletion, public support intake, contact-reveal retention, and browse indexes.

create table if not exists public.board_account_deletion_jobs (
  user_id uuid primary key,
  status text not null default 'pending' check (status in ('pending','db_cleaned','storage_pending','auth_pending','completed','failed')),
  avatar_path text,
  listing_photo_paths text[] not null default '{}'::text[],
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  next_attempt_at timestamptz not null default now(),
  requested_at timestamptz not null default now(),
  db_cleaned_at timestamptz,
  auth_deleted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.board_account_deletion_jobs enable row level security;
revoke all on table public.board_account_deletion_jobs from anon, authenticated;
create index if not exists board_account_deletion_jobs_queue_idx
  on public.board_account_deletion_jobs(status,next_attempt_at)
  where status <> 'completed';

create table if not exists public.board_support_requests (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('account','moderation','safety','security','legal','general')),
  email text not null,
  message text not null,
  actor_hash text not null check (actor_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'open' check (status in ('open','in_progress','resolved','spam')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz not null default now(),
  assigned_to uuid,
  resolved_at timestamptz,
  resolution_note text
);
alter table public.board_support_requests enable row level security;
revoke all on table public.board_support_requests from anon, authenticated;
create index if not exists board_support_requests_queue_idx on public.board_support_requests(status,created_at);
create index if not exists board_support_requests_rate_idx on public.board_support_requests(actor_hash,created_at desc);

create table if not exists public.board_contact_reveals (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null,
  listing_id text not null,
  created_at timestamptz not null default now()
);
alter table public.board_contact_reveals enable row level security;
revoke all on table public.board_contact_reveals from anon, authenticated;
create index if not exists board_contact_reveals_rate_idx on public.board_contact_reveals(viewer_id,created_at desc);
create index if not exists board_contact_reveals_listing_idx on public.board_contact_reveals(listing_id,created_at desc);

create index if not exists board_listings_browse_page on public.board_listings(posted_at desc,id desc) where hidden_at is null;
create index if not exists board_listings_browse_country_idx on public.board_listings(country_code,posted_at desc,id desc) where hidden_at is null;
create index if not exists board_listings_browse_category_idx on public.board_listings((payload->>'category'),posted_at desc,id desc) where hidden_at is null;
create index if not exists board_listings_browse_city_idx on public.board_listings(lower(payload->>'city'),posted_at desc,id desc) where hidden_at is null;
create index if not exists board_listings_browse_type_idx on public.board_listings((payload->>'subcategory'),posted_at desc,id desc) where hidden_at is null;
create index if not exists board_listings_search_idx on public.board_listings
using gin (to_tsvector('simple'::regconfig, coalesce(payload->>'title','') || ' ' || coalesce(payload->>'description','')));

create or replace function public.begin_board_account_deletion(p_user uuid)
returns void language plpgsql set search_path to 'public' as $$
begin
  if p_user is null then raise exception 'Invalid account deletion request'; end if;
  insert into public.board_account_deletion_jobs(user_id,status,next_attempt_at,updated_at)
  values(p_user,'pending',now(),now())
  on conflict(user_id) do update
    set status=case when board_account_deletion_jobs.status='completed' then 'completed' else 'pending' end,
        next_attempt_at=case when board_account_deletion_jobs.status='completed' then board_account_deletion_jobs.next_attempt_at else now() end,
        last_error=case when board_account_deletion_jobs.status='completed' then board_account_deletion_jobs.last_error else null end,
        updated_at=now();
end $$;

create or replace function public.board_account_deletion_pending(p_user uuid)
returns boolean language sql stable set search_path to 'public' as $$
  select exists(select 1 from public.board_account_deletion_jobs where user_id=p_user and status <> 'completed');
$$;

create or replace function public.set_board_account_deletion_resources(p_user uuid, p_avatar text, p_listing_photos text[])
returns void language plpgsql set search_path to 'public' as $$
begin
  update public.board_account_deletion_jobs
  set avatar_path=p_avatar, listing_photo_paths=coalesce(p_listing_photos,'{}'::text[]), updated_at=now()
  where user_id=p_user and status <> 'completed';
  if not found then raise exception 'Account deletion job not found'; end if;
end $$;

create or replace function public.cleanup_board_account_data(p_user uuid)
returns void language plpgsql set search_path to 'public' as $$
declare listing_ids text[];
begin
  if not exists(select 1 from public.board_account_deletion_jobs where user_id=p_user and status <> 'completed') then
    raise exception 'Account deletion has not been requested';
  end if;
  select coalesce(array_agg(id),'{}'::text[]) into listing_ids from public.board_listings where owner_id=p_user;
  delete from public.board_promotion_notifications where owner_id=p_user;
  delete from public.board_saves where owner_id=p_user or listing_id=any(listing_ids);
  delete from public.board_messages where owner_id=p_user;
  delete from public.board_reports where reporter_id=p_user;
  update public.board_reports set reviewed_by=null where reviewed_by=p_user;
  delete from public.board_contact_events where actor_id=p_user and actor_kind='auth';
  delete from public.board_contact_reveals where viewer_id=p_user;
  delete from public.board_whatsapp_consents where buyer_id=p_user or seller_id=p_user;
  delete from public.board_conversations where buyer_id=p_user or listing_owner_id=p_user;
  delete from public.board_listings where owner_id=p_user;
  delete from public.board_profiles where user_id=p_user;
  delete from public.board_session_claims where user_id=p_user;
  delete from public.board_user_roles where user_id=p_user;
  update public.board_account_deletion_jobs
  set status='db_cleaned', db_cleaned_at=coalesce(db_cleaned_at,now()), last_error=null, next_attempt_at=now(), updated_at=now()
  where user_id=p_user;
end $$;

create or replace function public.create_board_support_request(p_category text, p_email text, p_message text, p_actor_hash text)
returns uuid language plpgsql set search_path to 'public' as $$
declare request_id uuid;
begin
  if p_category not in ('account','moderation','safety','security','legal','general')
     or p_email is null or length(trim(p_email)) not between 3 and 320
     or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_message is null or length(trim(p_message)) not between 10 and 4000
     or p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid support request';
  end if;
  if (select count(*) from public.board_support_requests where actor_hash=p_actor_hash and created_at>now()-interval '1 hour') >= 5 then
    raise exception 'Too many support requests. Try again later.';
  end if;
  insert into public.board_support_requests(category,email,message,actor_hash)
  values(p_category,lower(trim(p_email)),trim(p_message),p_actor_hash)
  returning id into request_id;
  return request_id;
end $$;

create or replace function public.expire_board_contact_reveals()
returns bigint language plpgsql set search_path to 'public' as $$
declare removed bigint;
begin
  delete from public.board_contact_reveals where created_at<now()-interval '7 days';
  get diagnostics removed=row_count;
  return removed;
end $$;
