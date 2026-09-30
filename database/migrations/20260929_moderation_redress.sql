-- Reversible moderation decisions and internal appeals.
-- Apply before deploying the corresponding moderation/redress application code.

alter table public.moderation_actions
  add column if not exists subject_user_id uuid references auth.users (id) on delete set null,
  add column if not exists listing_title text,
  add column if not exists restriction_type text,
  add column if not exists decision_reason text,
  add column if not exists policy_basis text,
  add column if not exists automated boolean not null default false,
  add column if not exists notified_at timestamptz,
  add column if not exists appeal_until timestamptz;

alter table public.moderation_actions
  drop constraint if exists moderation_actions_restriction_type_check;

alter table public.moderation_actions
  add constraint moderation_actions_restriction_type_check
  check (
    restriction_type is null or
    restriction_type in ('visibility_restricted','content_removed','sponsored_label','no_restriction')
  );

create index if not exists moderation_actions_subject_created
  on public.moderation_actions (subject_user_id, created_at desc);

create index if not exists moderation_actions_appeal_until
  on public.moderation_actions (appeal_until)
  where appeal_until is not null;

create table if not exists public.moderation_appeals (
  id uuid primary key,
  moderation_action_id uuid not null references public.moderation_actions (id) on delete cascade,
  appellant_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 2500),
  status text not null default 'pending'
    check (status in ('pending','upheld','reversed')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  resolution text check (resolution is null or char_length(resolution) <= 2500)
);

create unique index if not exists moderation_appeals_one_open_per_action
  on public.moderation_appeals (moderation_action_id, appellant_user_id)
  where status = 'pending';

create index if not exists moderation_appeals_status_submitted
  on public.moderation_appeals (status, submitted_at);

alter table public.moderation_appeals enable row level security;
revoke all on table public.moderation_appeals from anon, authenticated;

-- Keep moderation action evidence server-only.
alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;
