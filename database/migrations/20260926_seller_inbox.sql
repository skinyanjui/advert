-- Seller inbox: real buyer↔seller conversations (no sample replies).
-- Apply manually after 20260926_seller_accounts.sql. Do not run from the app.

create table if not exists public.board_conversations (
  id uuid primary key,
  listing_id text not null,
  listing_owner_id uuid not null,
  buyer_id uuid not null,
  listing_title text not null,
  seller_name text not null,
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create index if not exists board_conversations_listing_owner
  on public.board_conversations (listing_owner_id, updated_at desc);
create index if not exists board_conversations_buyer
  on public.board_conversations (buyer_id, updated_at desc);
create index if not exists board_conversations_listing
  on public.board_conversations (listing_id);

create table if not exists public.board_conversation_messages (
  id uuid primary key,
  conversation_id uuid not null references public.board_conversations (id) on delete cascade,
  sender_id uuid not null,
  body text not null check (char_length(body) between 1 and 1000),
  sent_at timestamptz not null default now()
);
create index if not exists board_conversation_messages_thread
  on public.board_conversation_messages (conversation_id, sent_at);

alter table public.board_conversations enable row level security;
alter table public.board_conversation_messages enable row level security;

revoke all on public.board_conversations, public.board_conversation_messages from anon, authenticated;
grant select, insert, update on public.board_conversations to authenticated;
grant select, insert on public.board_conversation_messages to authenticated;

-- Only the buyer and the listing owner may read or write a thread.
drop policy if exists "Participants read conversations" on public.board_conversations;
create policy "Participants read conversations"
  on public.board_conversations for select to authenticated
  using (buyer_id = auth.uid() or listing_owner_id = auth.uid());

drop policy if exists "Buyers start conversations" on public.board_conversations;
create policy "Buyers start conversations"
  on public.board_conversations for insert to authenticated
  with check (buyer_id = auth.uid() and listing_owner_id <> auth.uid());

drop policy if exists "Participants update read state" on public.board_conversations;
create policy "Participants update read state"
  on public.board_conversations for update to authenticated
  using (buyer_id = auth.uid() or listing_owner_id = auth.uid())
  with check (buyer_id = auth.uid() or listing_owner_id = auth.uid());

drop policy if exists "Participants read messages" on public.board_conversation_messages;
create policy "Participants read messages"
  on public.board_conversation_messages for select to authenticated
  using (
    exists (
      select 1 from public.board_conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.listing_owner_id = auth.uid())
    )
  );

drop policy if exists "Participants send messages" on public.board_conversation_messages;
create policy "Participants send messages"
  on public.board_conversation_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.board_conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.listing_owner_id = auth.uid())
    )
  );

-- Legacy board_messages rows (sample-reply era) are left in place but unused by the app.
-- Optional cleanup after deploy: truncate public.board_messages;

-- Owner: no new Auth settings. Redeploy after applying this SQL so claim/inbox routes work.
