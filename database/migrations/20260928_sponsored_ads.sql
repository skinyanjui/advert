-- Sponsored listings flag, undisclosed promo report reason, moderation action log.
-- Apply manually after prior board migrations (including report_listing).
-- Do not run from the app. Must run BEFORE merge/deploy of sponsored-ad app code.
-- App code tolerates a missing sponsored column / moderation_actions table where practical;
-- report reason undisclosed_promo requires this migration.

alter table public.board_listings
  add column if not exists sponsored boolean not null default false;

-- Widen board_reports.reason check to include undisclosed paid promotion.
alter table public.board_reports
  drop constraint if exists board_reports_reason_check;

alter table public.board_reports
  add constraint board_reports_reason_check
  check (
    reason in (
      'spam',
      'scam',
      'prohibited',
      'wrong_category',
      'offensive',
      'undisclosed_promo',
      'other'
    )
  );

create table if not exists public.moderation_actions (
  id uuid primary key,
  report_id uuid references public.board_reports (id) on delete set null,
  listing_id text references public.board_listings (id) on delete set null,
  admin_id uuid not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_listing
  on public.moderation_actions (listing_id, created_at desc);
create index if not exists moderation_actions_report
  on public.moderation_actions (report_id, created_at desc);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;

revoke all on table public.board_listings from anon, authenticated;
alter table public.board_listings enable row level security;
revoke all on table public.board_reports from anon, authenticated;
alter table public.board_reports enable row level security;

-- Owner: apply this SQL on the Supabase board project before merge.
-- Verify: board_listings.sponsored exists; board_reports accepts undisclosed_promo;
-- publishable key cannot select moderation_actions.
