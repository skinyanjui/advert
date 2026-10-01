-- Cover relationship lookups without granting any new client access.
create index if not exists board_listings_country_currency on public.board_listings(country_code,currency_code);
create index if not exists board_user_roles_assigned_by on public.board_user_roles(assigned_by);
alter table public.board_listings validate constraint board_listings_payload_contract;
alter table public.board_listings validate constraint board_listings_country_currency_fk;
