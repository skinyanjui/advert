-- Report listing + admin moderation.
-- Apply manually after 20260926_seller_inbox.sql. Do not run from the app.

alter table public.board_listings
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_reason text
    check (hidden_reason is null or hidden_reason in ('reports', 'admin'));

create index if not exists board_listings_hidden
  on public.board_listings (hidden_at)
  where hidden_at is not null;

create table if not exists public.board_reports (
  id uuid primary key,
  listing_id text not null references public.board_listings (id) on delete cascade,
  reporter_id uuid not null,
  reason text not null check (
    reason in (
      'spam',
      'scam',
      'prohibited',
      'wrong_category',
      'offensive',
      'other'
    )
  ),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique (listing_id, reporter_id)
);
create index if not exists board_reports_pending
  on public.board_reports (status, created_at desc);
create index if not exists board_reports_listing
  on public.board_reports (listing_id, status);
create index if not exists board_reports_reporter
  on public.board_reports (reporter_id, created_at desc);

alter table public.board_reports enable row level security;
revoke all on public.board_reports from anon, authenticated;
-- App uses the service role. Authenticated users get no direct table access.

-- Owner: set ADMIN_EMAILS (comma-separated) and optional REPORT_AUTO_HIDE_THRESHOLD
-- (default 3) in Vercel env, then redeploy. No Supabase Auth changes required.
