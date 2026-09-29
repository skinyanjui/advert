-- Explicit, scoped buyer consent for WhatsApp contact.
-- Stores no phone numbers and no message contents.

create table if not exists public.board_whatsapp_consents (
  id uuid primary key,
  listing_id text not null references public.board_listings (id) on delete cascade,
  seller_id uuid not null,
  buyer_id uuid not null,
  buyer_kind text not null check (buyer_kind in ('auth', 'session')),
  seller_name_snapshot text not null,
  listing_title_snapshot text not null,
  scope text not null check (scope = 'listing_replies'),
  consent_version text not null,
  consent_statement text not null,
  consented_at timestamptz not null default now()
);

create index if not exists board_whatsapp_consents_listing
  on public.board_whatsapp_consents (listing_id, consented_at desc);

create index if not exists board_whatsapp_consents_buyer
  on public.board_whatsapp_consents (buyer_id, consented_at desc);

alter table public.board_whatsapp_consents enable row level security;
revoke all on public.board_whatsapp_consents from anon, authenticated;
