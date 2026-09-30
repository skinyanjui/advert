-- Restrict saved display-currency preferences to African-issued currencies.
-- Existing non-African preferences are cleared so the application falls back to KES.
update public.board_profiles
set currency = null
where currency is not null
  and currency not in ('AOA', 'BIF', 'BWP', 'CDF', 'CVE', 'DJF', 'DZD', 'EGP', 'ERN', 'ETB', 'GHS', 'GMD', 'GNF', 'KES', 'KMF', 'LRD', 'LSL', 'LYD', 'MAD', 'MGA', 'MRU', 'MUR', 'MWK', 'MZN', 'NAD', 'NGN', 'RWF', 'SCR', 'SDG', 'SLE', 'SOS', 'SSP', 'STN', 'SZL', 'TND', 'TZS', 'UGX', 'XAF', 'XOF', 'ZAR', 'ZMW');

alter table public.board_profiles drop constraint if exists board_profiles_currency_check;
alter table public.board_profiles
  add constraint board_profiles_currency_check
  check (currency is null or currency in ('AOA', 'BIF', 'BWP', 'CDF', 'CVE', 'DJF', 'DZD', 'EGP', 'ERN', 'ETB', 'GHS', 'GMD', 'GNF', 'KES', 'KMF', 'LRD', 'LSL', 'LYD', 'MAD', 'MGA', 'MRU', 'MUR', 'MWK', 'MZN', 'NAD', 'NGN', 'RWF', 'SCR', 'SDG', 'SLE', 'SOS', 'SSP', 'STN', 'SZL', 'TND', 'TZS', 'UGX', 'XAF', 'XOF', 'ZAR', 'ZMW'));
