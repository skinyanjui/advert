-- Owner-only, first-party contact intent reporting. Apply after contact_events and contact_sms.
-- Existing actor-linked events remain covered by privacy export and account deletion.
delete from public.board_contact_events where created_at < now() - interval '90 days';
delete from public.board_contact_events where id in (
  select id from (
    select id, row_number() over (
      partition by listing_id, actor_id, actor_kind, event_type, (created_at at time zone 'UTC')::date
      order by created_at, id
    ) as duplicate_number from public.board_contact_events
  ) duplicates where duplicate_number > 1
);

create unique index if not exists board_contact_events_daily_unique
  on public.board_contact_events (listing_id, actor_id, actor_kind, event_type, ((created_at at time zone 'UTC')::date));
revoke all on public.board_contact_events from public, anon, authenticated;
grant select, insert, delete on public.board_contact_events to service_role;

create or replace function public.record_board_contact_event(p_listing text, p_actor uuid, p_kind text, p_event text)
returns void language plpgsql set search_path = public as $$
declare l public.board_listings;
begin
  if p_actor is null or p_kind not in ('auth', 'session') or p_event not in ('listing_view', 'whatsapp_click', 'phone_click', 'sms_click', 'message_start') then return; end if;
  if p_event <> 'listing_view' and p_kind <> 'auth' then return; end if;
  select * into l from public.board_listings where id = p_listing;
  if not found or l.owner_id = p_actor or l.status <> 'active' or l.hidden_at is not null or l.expires_at <= now() then return; end if;
  if p_event in ('phone_click', 'sms_click') and coalesce(l.payload->>'contactPhone', 'false') <> 'true' then return; end if;
  if p_event = 'whatsapp_click' and coalesce(l.payload->>'contactWhatsApp', 'false') <> 'true' then return; end if;
  insert into public.board_contact_events(id, listing_id, actor_id, actor_kind, event_type)
    values (gen_random_uuid(), p_listing, p_actor, p_kind, p_event) on conflict do nothing;
end;
$$;

create or replace function public.seller_contact_leads(p_owner uuid, p_listing_ids text[] default null, p_offset integer default 0, p_limit integer default 51)
returns table(listing_id text, listing_title text, listing_status text, views bigint, contacts bigint, whatsapp bigint, calls bigint, texts bigint, messages bigint)
language sql stable set search_path = public as $$
  with owned as (
    select l.id, l.payload->>'title' as title, l.status, l.posted_at from public.board_listings l
    where l.owner_id = p_owner and (p_listing_ids is null or l.id = any(p_listing_ids))
    order by l.posted_at desc, l.id
    limit greatest(1, least(p_limit, 51)) offset greatest(p_offset, 0)
  )
  select l.id, coalesce(l.title, l.id), l.status,
    count(distinct (e.actor_kind, e.actor_id)) filter (where e.event_type = 'listing_view'),
    count(distinct e.actor_id) filter (where e.event_type <> 'listing_view' and e.actor_kind = 'auth'),
    count(distinct e.actor_id) filter (where e.event_type = 'whatsapp_click' and e.actor_kind = 'auth'),
    count(distinct e.actor_id) filter (where e.event_type = 'phone_click' and e.actor_kind = 'auth'),
    count(distinct e.actor_id) filter (where e.event_type = 'sms_click' and e.actor_kind = 'auth'),
    count(distinct e.actor_id) filter (where e.event_type = 'message_start' and e.actor_kind = 'auth')
  from owned l left join public.board_contact_events e on e.listing_id = l.id and e.actor_id <> p_owner and e.created_at >= now() - interval '90 days'
  group by l.id, l.title, l.status, l.posted_at order by l.posted_at desc, l.id;
$$;

create or replace function public.expire_board_contact_events()
returns bigint language plpgsql set search_path = public as $$
declare removed bigint;
begin
  delete from public.board_contact_events where created_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.record_board_contact_event(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.seller_contact_leads(uuid, text[], integer, integer) from public, anon, authenticated;
revoke all on function public.expire_board_contact_events() from public, anon, authenticated;
grant execute on function public.record_board_contact_event(text, uuid, text, text) to service_role;
grant execute on function public.seller_contact_leads(uuid, text[], integer, integer) to service_role;
grant execute on function public.expire_board_contact_events() to service_role;
