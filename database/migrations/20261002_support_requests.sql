create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  category text not null check (category in ('account','moderation','safety','security','legal','general')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_queue on public.support_requests(status, created_at);
create index if not exists support_requests_email_recent on public.support_requests(email, created_at desc);

alter table public.support_requests enable row level security;
revoke all on table public.support_requests from anon, authenticated;
grant select, insert, update, delete on table public.support_requests to service_role;

comment on table public.support_requests is
  'Public support intake queue. API-mediated only; direct client access is revoked.';
