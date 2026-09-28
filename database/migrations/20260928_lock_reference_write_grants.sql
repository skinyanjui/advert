-- Reference tables are public-read via RLS SELECT policies.
-- Schema intent (database/schema.sql) is SELECT-only for anon/authenticated.
-- Revoke accidental write privileges that appear after default grants; keep SELECT.

revoke insert, update, delete, truncate, references, trigger
  on table
    public.reference_countries,
    public.reference_cities,
    public.reference_currencies,
    public.reference_country_currencies,
    public.reference_languages,
    public.reference_country_languages,
    public.reference_timezones
  from anon, authenticated;

grant select on table
  public.reference_countries,
  public.reference_cities,
  public.reference_currencies,
  public.reference_country_currencies,
  public.reference_languages,
  public.reference_country_languages,
  public.reference_timezones
  to anon, authenticated;

revoke all on table public.reference_imports from anon, authenticated;
revoke all on table public.board_profiles from anon, authenticated;
