-- Ad expiry (60 days from post/renew) with safe grandfathering for existing ads.
-- Apply manually after 20260926_report_listing.sql. Do not run from the app.

alter table public.board_listings
  add column if not exists expires_at timestamptz,
  add column if not exists expiry_reminder_sent_at timestamptz;

-- Existing ads: start a fresh 60-day window from deploy (no mass expiry).
update public.board_listings
set expires_at = now() + interval '60 days'
where expires_at is null;

alter table public.board_listings
  alter column expires_at set default (now() + interval '60 days');

-- Backfill any row still missing (should be none after the update).
update public.board_listings
set expires_at = coalesce(expires_at, now() + interval '60 days')
where expires_at is null;

do $$
begin
  alter table public.board_listings alter column expires_at set not null;
exception
  when others then null;
end $$;

create index if not exists board_listings_expires_at
  on public.board_listings (expires_at);

create index if not exists board_listings_expiry_reminder
  on public.board_listings (expires_at)
  where expiry_reminder_sent_at is null;

-- Owner: set CRON_SECRET in Vercel, add cron for /api/cron/expiry-reminders (daily).
-- Optional RESEND_API_KEY + RESEND_FROM_EMAIL for real email; without them the cron is a no-op send.
