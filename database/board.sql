-- Private board data. The Next.js API uses the server-only Supabase secret key.
-- After enabling seller accounts, also apply database/migrations/20260926_seller_accounts.sql
create table if not exists public.board_listings (
  id text primary key check (id ~ '^ad-[a-zA-Z0-9-]{1,64}$'),
  owner_id uuid not null,
  posted_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists board_listings_posted_at on public.board_listings (posted_at desc);
create index if not exists board_listings_owner on public.board_listings (owner_id);

create table if not exists public.board_saves (
  owner_id uuid not null,
  listing_id text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, listing_id)
);
create index if not exists board_saves_created_at on public.board_saves (owner_id, created_at desc);

create table if not exists public.board_messages (
  id uuid primary key,
  owner_id uuid not null,
  listing_id text not null,
  sent_at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists board_messages_owner on public.board_messages (owner_id, sent_at);

alter table public.board_listings enable row level security;
alter table public.board_saves enable row level security;
alter table public.board_messages enable row level security;
revoke all on public.board_listings, public.board_saves, public.board_messages from anon, authenticated;

-- Publicly served listing photos; server-only upload and deletion.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 1500000,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1500000,
  allowed_mime_types = excluded.allowed_mime_types;
