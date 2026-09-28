-- Append-only Terms and Privacy acceptance records.
-- Apply manually after prior board migrations. Do not run from the app.
-- Must run BEFORE merge/deploy of the terms-acceptance app code.

create table if not exists public.terms_acceptances (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  ip text,
  user_agent text,
  context text not null
    check (context in ('signup', 'reaccept'))
);

create index if not exists terms_acceptances_user_accepted
  on public.terms_acceptances (user_id, accepted_at desc);

alter table public.terms_acceptances enable row level security;
revoke all on table public.terms_acceptances from anon, authenticated;
-- App uses the service role. Authenticated users get no direct table access.

-- Owner: apply this SQL on the Supabase board project before merge.
-- Verify: publishable key cannot select terms_acceptances; service role can insert.
