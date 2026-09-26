-- Lock board table reads so the public/anon (and authenticated) Supabase keys
-- cannot SELECT listings or other private board data.
-- The Next.js app reads and writes these tables only with the server-side
-- service-role secret key (boardDb). Apply manually. Do not run from the app.

-- ---------------------------------------------------------------------------
-- board_listings: drop public SELECT and all client-role access
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read listings" on public.board_listings;
drop policy if exists "Owners insert listings" on public.board_listings;
drop policy if exists "Owners update listings" on public.board_listings;
drop policy if exists "Owners delete listings" on public.board_listings;

revoke all on table public.board_listings from anon, authenticated;

alter table public.board_listings enable row level security;

-- ---------------------------------------------------------------------------
-- board_saves / board_messages: service role only (same as original board.sql)
-- ---------------------------------------------------------------------------
drop policy if exists "Owners manage saves" on public.board_saves;
drop policy if exists "Owners manage messages" on public.board_messages;

revoke all on table public.board_saves from anon, authenticated;
revoke all on table public.board_messages from anon, authenticated;

alter table public.board_saves enable row level security;
alter table public.board_messages enable row level security;

-- ---------------------------------------------------------------------------
-- board_profiles / board_session_claims: no client table access
-- (claim API and cron use the service role)
-- ---------------------------------------------------------------------------
drop policy if exists "Owners manage profile" on public.board_profiles;

revoke all on table public.board_profiles from anon, authenticated;
revoke all on table public.board_session_claims from anon, authenticated;

alter table public.board_profiles enable row level security;
alter table public.board_session_claims enable row level security;

-- ---------------------------------------------------------------------------
-- Inbox: app uses the service role; clients must not query these tables.
-- Participant policies from 20260926_seller_inbox.sql are removed so a stolen
-- publishable key cannot read any conversation rows.
-- ---------------------------------------------------------------------------
drop policy if exists "Participants read conversations" on public.board_conversations;
drop policy if exists "Buyers start conversations" on public.board_conversations;
drop policy if exists "Participants update read state" on public.board_conversations;
drop policy if exists "Participants read messages" on public.board_conversation_messages;
drop policy if exists "Participants send messages" on public.board_conversation_messages;

revoke all on table public.board_conversations from anon, authenticated;
revoke all on table public.board_conversation_messages from anon, authenticated;

alter table public.board_conversations enable row level security;
alter table public.board_conversation_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Reports: already revoked in 20260926_report_listing.sql; re-assert.
-- ---------------------------------------------------------------------------
revoke all on table public.board_reports from anon, authenticated;
alter table public.board_reports enable row level security;

-- Owner: apply this SQL on the Supabase project, then redeploy is optional
-- (no app code change required). Verify with the publishable key that
-- select * from board_listings returns a permission/RLS error.
