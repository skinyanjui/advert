-- Allow the neutral country-driven currency preference.
alter table public.board_profiles
  drop constraint if exists board_profiles_currency_check;

alter table public.board_profiles
  add constraint board_profiles_currency_check
  check (currency is null or currency = 'listing' or currency ~ '^[A-Z]{3}$');

comment on column public.board_profiles.currency is
  'Explicit display-currency override. listing means follow active/default market country and then listing country.';
