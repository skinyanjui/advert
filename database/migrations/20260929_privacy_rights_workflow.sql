-- Privacy-rights workflow and stronger legal-acceptance evidence.
-- Apply before deploying the corresponding application code.

alter table public.terms_acceptances
  add column if not exists age_attested boolean not null default false,
  add column if not exists privacy_acknowledged boolean not null default false,
  add column if not exists disclosure_version text,
  add column if not exists locale text;

alter table public.terms_acceptances
  drop constraint if exists terms_acceptances_locale_check;

alter table public.terms_acceptances
  add constraint terms_acceptances_locale_check
  check (locale is null or char_length(locale) between 2 and 16);

create table if not exists public.privacy_requests (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete set null,
  request_email text not null check (char_length(request_email) between 3 and 320),
  subject_email text check (subject_email is null or char_length(subject_email) between 3 and 320),
  acting_as_agent boolean not null default false,
  jurisdiction text not null check (
    jurisdiction in (
      'eu_eea',
      'california',
      'colorado',
      'oregon',
      'texas',
      'kenya',
      'nigeria',
      'south_africa',
      'ghana',
      'other'
    )
  ),
  request_type text not null check (
    request_type in (
      'access',
      'portability',
      'correction',
      'deletion',
      'restriction',
      'objection',
      'opt_out',
      'limit_sensitive',
      'withdraw_consent',
      'appeal'
    )
  ),
  details text check (details is null or char_length(details) <= 1500),
  locale text check (locale is null or char_length(locale) between 2 and 16),
  status text not null default 'received' check (
    status in (
      'verification_required',
      'received',
      'in_progress',
      'completed',
      'denied',
      'appealed'
    )
  ),
  received_at timestamptz not null default now(),
  due_at timestamptz not null,
  verified_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  resolution text check (resolution is null or char_length(resolution) <= 2500),
  last_updated_by uuid references auth.users (id) on delete set null
);

create index if not exists privacy_requests_user_received
  on public.privacy_requests (user_id, received_at desc);

create index if not exists privacy_requests_status_due
  on public.privacy_requests (status, due_at);

create index if not exists privacy_requests_email_received
  on public.privacy_requests (lower(request_email), received_at desc);

create table if not exists public.privacy_request_events (
  id uuid primary key,
  request_id uuid not null references public.privacy_requests (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null check (
    event_type in (
      'created',
      'verified',
      'started',
      'completed',
      'denied',
      'appealed',
      'updated'
    )
  ),
  note text check (note is null or char_length(note) <= 1500),
  created_at timestamptz not null default now()
);

create index if not exists privacy_request_events_request_created
  on public.privacy_request_events (request_id, created_at);

alter table public.privacy_requests enable row level security;
alter table public.privacy_request_events enable row level security;

revoke all on table public.privacy_requests, public.privacy_request_events from anon, authenticated;
-- The application uses the server-only service role after API-level RBAC.
