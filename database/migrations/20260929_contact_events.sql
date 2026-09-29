-- Minimal first-party contact intent analytics.
-- Apply manually after the existing board migrations.
-- Stores no phone numbers and no WhatsApp/message contents.

create table if not exists public.board_contact_events (
  id uuid primary key,
  listing_id text not null references public.board_listings (id) on delete cascade,
  actor_id uuid not null,
  actor_kind text not null check (actor_kind in ('auth', 'session')),
  event_type text not null check (
    event_type in ('listing_view', 'whatsapp_click', 'phone_click', 'message_start')
  ),
  created_at timestamptz not null default now()
);

create index if not exists board_contact_events_listing_created
  on public.board_contact_events (listing_id, created_at desc);

create index if not exists board_contact_events_event_created
  on public.board_contact_events (event_type, created_at desc);

alter table public.board_contact_events enable row level security;
revoke all on public.board_contact_events from anon, authenticated;
-- The Next.js API writes with the server-only service role.
