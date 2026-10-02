create table if not exists public.account_deletion_jobs (
  user_id uuid primary key,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'finalizing', 'complete')),
  attempts integer not null default 0 check (attempts >= 0),
  requested_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  completed_at timestamptz,
  resources jsonb not null default '{}'::jsonb,
  last_error jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists account_deletion_jobs_retry
  on public.account_deletion_jobs (next_attempt_at, requested_at)
  where status <> 'complete';

alter table public.account_deletion_jobs enable row level security;
revoke all on table public.account_deletion_jobs from anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_jobs to service_role;

comment on table public.account_deletion_jobs is
  'Durable account deletion tombstones and retry state. Server/service-role only.';
