-- Operational mailbox evidence; no customer records or message contents.
create table if not exists public.payment_support_verification (
  singleton boolean primary key default true check(singleton),
  email text not null,
  challenge_hash text,
  challenge_expires_at timestamptz,
  requested_at timestamptz not null default now(),
  verified_at timestamptz
);
alter table public.payment_support_verification enable row level security;
revoke all on public.payment_support_verification from public, anon, authenticated;
grant select, insert, update on public.payment_support_verification to service_role;

create or replace function public.request_payment_support_verification(p_email text, p_hash text)
returns void language plpgsql set search_path = public as $$
declare existing public.payment_support_verification;
begin
  -- Serialize concurrent first inserts and resends without exposing the code.
  perform pg_advisory_xact_lock(7643002);
  select * into existing from payment_support_verification where singleton for update;
  if found and existing.requested_at > now() - interval '60 seconds' then
    raise exception 'Wait one minute before sending another verification email.';
  end if;
  if p_email is null or length(p_email) > 254 or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid mailbox verification request.';
  end if;
  insert into payment_support_verification(singleton,email,challenge_hash,challenge_expires_at,requested_at)
  values(true,p_email,p_hash,now()+interval '30 minutes',now())
  on conflict(singleton) do update set email=excluded.email,challenge_hash=excluded.challenge_hash,
    challenge_expires_at=excluded.challenge_expires_at,requested_at=excluded.requested_at,
    verified_at=case when payment_support_verification.email=excluded.email then payment_support_verification.verified_at else null end;
end $$;

create or replace function public.confirm_payment_support_verification(p_email text, p_hash text)
returns boolean language plpgsql set search_path = public as $$
begin
  update payment_support_verification set verified_at=now(),challenge_hash=null,challenge_expires_at=null
    where singleton and email=p_email and challenge_hash=p_hash and challenge_expires_at>now();
  return found;
end $$;
revoke all on function public.request_payment_support_verification(text,text) from public, anon, authenticated;
revoke all on function public.confirm_payment_support_verification(text,text) from public, anon, authenticated;
grant execute on function public.request_payment_support_verification(text,text) to service_role;
grant execute on function public.confirm_payment_support_verification(text,text) to service_role;
