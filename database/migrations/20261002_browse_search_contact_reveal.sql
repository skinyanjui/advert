-- Bounded browse search: indexed filters + full-text query + keyset cursor.
alter table public.board_listings
  add column if not exists browse_country text generated always as (payload->>'country') stored,
  add column if not exists browse_city text generated always as (lower(coalesce(payload->>'city',''))) stored,
  add column if not exists browse_category text generated always as (payload->>'category') stored,
  add column if not exists browse_subcategory text generated always as (payload->>'subcategory') stored,
  add column if not exists browse_search tsvector generated always as (
    to_tsvector('simple'::regconfig,
      coalesce(payload->>'title','') || ' ' ||
      coalesce(payload->>'description','') || ' ' ||
      coalesce(payload->>'city','') || ' ' ||
      coalesce(payload->>'locationDetail','')
    )
  ) stored;

create index if not exists board_listings_browse_order
  on public.board_listings (posted_at desc, id desc)
  where hidden_at is null;
create index if not exists board_listings_browse_country
  on public.board_listings (browse_country, posted_at desc, id desc)
  where hidden_at is null;
create index if not exists board_listings_browse_category
  on public.board_listings (browse_category, posted_at desc, id desc)
  where hidden_at is null;
create index if not exists board_listings_browse_city
  on public.board_listings (browse_country, browse_city, posted_at desc, id desc)
  where hidden_at is null;
create index if not exists board_listings_browse_subcategory
  on public.board_listings (browse_category, browse_subcategory, posted_at desc, id desc)
  where hidden_at is null;
create index if not exists board_listings_browse_search
  on public.board_listings using gin (browse_search);

create or replace function public.search_board_listings(
  p_country text default null,
  p_city text default null,
  p_category text default null,
  p_subcategory text default null,
  p_query text default null,
  p_cursor_posted_at timestamptz default null,
  p_cursor_id text default null,
  p_limit integer default 25
)
returns setof public.board_listings
language sql
stable
security definer
set search_path = public
as $$
  select l.*
  from public.board_listings l
  where l.hidden_at is null
    and coalesce(l.status, 'active') = 'active'
    and (l.expires_at is null or l.expires_at > now())
    and (p_country is null or l.browse_country = p_country)
    and (p_city is null or l.browse_city = lower(p_city))
    and (p_category is null or l.browse_category = p_category)
    and (p_subcategory is null or l.browse_subcategory = p_subcategory)
    and (
      nullif(trim(coalesce(p_query,'')), '') is null
      or l.browse_search @@ websearch_to_tsquery('simple'::regconfig, p_query)
    )
    and (
      p_cursor_posted_at is null
      or (l.posted_at, l.id) < (p_cursor_posted_at, coalesce(p_cursor_id, ''))
    )
  order by l.posted_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit, 25), 50));
$$;

revoke all on function public.search_board_listings(text,text,text,text,text,timestamptz,text,integer) from public, anon, authenticated;
grant execute on function public.search_board_listings(text,text,text,text,text,timestamptz,text,integer) to service_role;

create table if not exists public.board_contact_reveals (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null,
  listing_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists board_contact_reveals_viewer_recent on public.board_contact_reveals(viewer_id, created_at desc);
create index if not exists board_contact_reveals_listing_recent on public.board_contact_reveals(listing_id, created_at desc);
alter table public.board_contact_reveals enable row level security;
revoke all on table public.board_contact_reveals from anon, authenticated;
grant select, insert, delete on table public.board_contact_reveals to service_role;
