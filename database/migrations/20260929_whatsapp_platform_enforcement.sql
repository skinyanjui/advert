-- WhatsApp Business Platform enforcement state and webhook history.
-- Server-only. No client access.

create table if not exists public.board_whatsapp_platform_status (
  waba_id text primary key,
  enforcement_state text not null check (
    enforcement_state in (
      'healthy',
      'warning',
      'template_restricted',
      'all_messages_restricted',
      'account_locked',
      'disabled',
      'unknown'
    )
  ),
  restriction_until timestamptz,
  policy_name text,
  summary text,
  last_event_at timestamptz,
  last_event_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.board_whatsapp_enforcement_events (
  id uuid primary key,
  waba_id text not null,
  event_type text not null,
  enforcement_state text not null,
  restriction_until timestamptz,
  policy_name text,
  summary text,
  provider_payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists board_whatsapp_enforcement_events_waba
  on public.board_whatsapp_enforcement_events (waba_id, received_at desc);

alter table public.board_whatsapp_platform_status enable row level security;
alter table public.board_whatsapp_enforcement_events enable row level security;
revoke all on public.board_whatsapp_platform_status from anon, authenticated;
revoke all on public.board_whatsapp_enforcement_events from anon, authenticated;
