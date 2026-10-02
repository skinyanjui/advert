-- Finish P1/P2 operational hardening: durable retry claims, write tombstones,
-- indexed public search, and least-privilege RPC execution.

alter table public.board_listings
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(payload->>'title','') || ' ' ||
      coalesce(payload->>'description','') || ' ' ||
      coalesce(payload->>'city','') || ' ' ||
      coalesce(payload->>'locationDetail','') || ' ' ||
      coalesce(payload->>'category','') || ' ' ||
      coalesce(payload->>'subcategory','')
    )
  ) stored;

create index if not exists board_listings_search_document_idx
  on public.board_listings using gin(search_document);

create or replace function public.claim_board_account_deletion(p_user uuid)
returns boolean
language plpgsql
set search_path to 'public'
as $$
declare claimed boolean := false;
begin
  update public.board_account_deletion_jobs
  set attempts=attempts+1,
      next_attempt_at=now()+interval '5 minutes',
      updated_at=now()
  where user_id=p_user
    and status <> 'completed'
    and next_attempt_at <= now();
  claimed := found;
  return claimed;
end $$;

create or replace function public.claim_board_account_deletions(p_limit integer default 20)
returns table(user_id uuid)
language plpgsql
set search_path to 'public'
as $$
begin
  return query
  with candidates as (
    select j.user_id
    from public.board_account_deletion_jobs j
    where j.status <> 'completed' and j.next_attempt_at <= now()
    order by j.next_attempt_at, j.requested_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),50))
  ),
  claimed as (
    update public.board_account_deletion_jobs j
    set attempts=j.attempts+1,
        next_attempt_at=now()+interval '5 minutes',
        updated_at=now()
    from candidates c
    where j.user_id=c.user_id
    returning j.user_id
  )
  select claimed.user_id from claimed;
end $$;

create or replace function public.reject_board_write_for_deleting_account()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  column_name text;
  candidate uuid;
begin
  foreach column_name in array tg_argv loop
    begin
      candidate := nullif(to_jsonb(new)->>column_name,'')::uuid;
    exception when invalid_text_representation then
      candidate := null;
    end;
    if candidate is not null and public.board_account_deletion_pending(candidate) then
      raise exception using
        errcode='42501',
        message='Account deletion is in progress; new writes are blocked.';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists board_listings_deletion_barrier on public.board_listings;
create trigger board_listings_deletion_barrier before insert or update on public.board_listings
for each row execute function public.reject_board_write_for_deleting_account('owner_id');

drop trigger if exists board_saves_deletion_barrier on public.board_saves;
create trigger board_saves_deletion_barrier before insert or update on public.board_saves
for each row execute function public.reject_board_write_for_deleting_account('owner_id');

drop trigger if exists board_messages_deletion_barrier on public.board_messages;
create trigger board_messages_deletion_barrier before insert or update on public.board_messages
for each row execute function public.reject_board_write_for_deleting_account('owner_id');

drop trigger if exists board_profiles_deletion_barrier on public.board_profiles;
create trigger board_profiles_deletion_barrier before insert or update on public.board_profiles
for each row execute function public.reject_board_write_for_deleting_account('user_id');

drop trigger if exists board_conversations_deletion_barrier on public.board_conversations;
create trigger board_conversations_deletion_barrier before insert or update on public.board_conversations
for each row execute function public.reject_board_write_for_deleting_account('buyer_id','listing_owner_id');

drop trigger if exists board_reports_deletion_barrier on public.board_reports;
create trigger board_reports_deletion_barrier before insert or update on public.board_reports
for each row execute function public.reject_board_write_for_deleting_account('reporter_id');

drop trigger if exists board_contact_events_deletion_barrier on public.board_contact_events;
create trigger board_contact_events_deletion_barrier before insert or update on public.board_contact_events
for each row execute function public.reject_board_write_for_deleting_account('actor_id');

drop trigger if exists board_whatsapp_consents_deletion_barrier on public.board_whatsapp_consents;
create trigger board_whatsapp_consents_deletion_barrier before insert or update on public.board_whatsapp_consents
for each row execute function public.reject_board_write_for_deleting_account('buyer_id','seller_id');

drop trigger if exists terms_acceptances_deletion_barrier on public.terms_acceptances;
create trigger terms_acceptances_deletion_barrier before insert or update on public.terms_acceptances
for each row execute function public.reject_board_write_for_deleting_account('user_id');

drop trigger if exists board_promotions_deletion_barrier on public.board_promotions;
create trigger board_promotions_deletion_barrier before insert or update on public.board_promotions
for each row execute function public.reject_board_write_for_deleting_account('owner_id');

drop trigger if exists board_promotion_notifications_deletion_barrier on public.board_promotion_notifications;
create trigger board_promotion_notifications_deletion_barrier before insert or update on public.board_promotion_notifications
for each row execute function public.reject_board_write_for_deleting_account('owner_id');

drop trigger if exists board_contact_reveals_deletion_barrier on public.board_contact_reveals;
create trigger board_contact_reveals_deletion_barrier before insert or update on public.board_contact_reveals
for each row execute function public.reject_board_write_for_deleting_account('viewer_id');

revoke execute on function public.begin_board_account_deletion(uuid) from public, anon, authenticated;
revoke execute on function public.board_account_deletion_pending(uuid) from public, anon, authenticated;
revoke execute on function public.set_board_account_deletion_resources(uuid,text,text[]) from public, anon, authenticated;
revoke execute on function public.cleanup_board_account_data(uuid) from public, anon, authenticated;
revoke execute on function public.create_board_support_request(text,text,text,text) from public, anon, authenticated;
revoke execute on function public.expire_board_contact_reveals() from public, anon, authenticated;
revoke execute on function public.claim_board_account_deletion(uuid) from public, anon, authenticated;
revoke execute on function public.claim_board_account_deletions(integer) from public, anon, authenticated;
grant execute on function public.begin_board_account_deletion(uuid) to service_role;
grant execute on function public.board_account_deletion_pending(uuid) to service_role;
grant execute on function public.set_board_account_deletion_resources(uuid,text,text[]) to service_role;
grant execute on function public.cleanup_board_account_data(uuid) to service_role;
grant execute on function public.create_board_support_request(text,text,text,text) to service_role;
grant execute on function public.expire_board_contact_reveals() to service_role;
grant execute on function public.claim_board_account_deletion(uuid) to service_role;
grant execute on function public.claim_board_account_deletions(integer) to service_role;
