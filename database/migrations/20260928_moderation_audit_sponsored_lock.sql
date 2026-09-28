-- Fix moderation_actions FKs (audit rows must survive listing/report deletes)
-- and add sponsored_locked so admin-marked sponsored ads cannot be unticked by sellers.
-- Apply manually after 20260928_sponsored_ads.sql. Do not run from the app.
-- Must run BEFORE merge/deploy of this follow-up.

alter table public.moderation_actions
  drop constraint if exists moderation_actions_listing_id_fkey;

alter table public.moderation_actions
  drop constraint if exists moderation_actions_report_id_fkey;

alter table public.board_listings
  add column if not exists sponsored_locked boolean not null default false;

revoke all on table public.board_listings from anon, authenticated;
alter table public.board_listings enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;
alter table public.moderation_actions enable row level security;

-- Owner: apply on the Supabase board project before merge.
-- Verify: deleting a listing no longer blocks moderation_actions inserts;
-- board_listings.sponsored_locked exists.
