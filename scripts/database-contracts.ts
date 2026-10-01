// Generate SQL checks for a migrated database. Every test write rolls back.
import countries from "../src/data/countries.json"
import { invalidListingCases, validListing } from "./contract-fixtures"

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const json = (value: unknown) => `${quote(JSON.stringify(value))}::jsonb`
const invalidCases = [
  ...invalidListingCases.map((fixture) => ({ name: fixture.name, payload: { ...validListing, ...fixture.patch } })),
  { name: "unknown detail field", payload: { ...validListing, details: { ...validListing.details, unexpected: "value" } } },
  { name: "mistyped title", payload: { ...validListing, title: 12345 } },
  { name: "null taxonomy version", payload: { ...validListing, taxonomyVersion: null } },
  { name: "future taxonomy version", payload: { ...validListing, taxonomyVersion: 2 } },
  { name: "too many photos", payload: { ...validListing, images: Array(7).fill(validListing.image) } },
]

const country = countries.find((country) => country.code === "KE")!
const sql = `begin;
do $checks$
declare
  fixture record;
  target_id text := 'ad-contract-' || gen_random_uuid()::text;
  target_owner uuid := gen_random_uuid();
  imports_before bigint;
  name_before text;
begin
  if has_table_privilege('anon','public.board_listings','SELECT')
     or has_table_privilege('authenticated','public.board_listings','INSERT')
     or has_function_privilege('anon','public.sync_reference_snapshot(jsonb,jsonb,text,text,timestamptz)','EXECUTE')
     or has_function_privilege('authenticated','public.sync_reference_snapshot(jsonb,jsonb,text,text,timestamptz)','EXECUTE') then
    raise exception 'Private table or sync function grants were exposed';
  end if;
  insert into public.board_listings(id,owner_id,payload) values(target_id,target_owner,${json(validListing)});
  delete from public.board_listings where id=target_id;
  insert into public.board_listings(id,owner_id,payload) values(target_id,target_owner,${json({ ...validListing, latitude: -1.2, longitude: 36.8, locationPrecision: "specific" })});
  delete from public.board_listings where id=target_id;
  for fixture in select value->>'name' as name,value->'payload' as payload from jsonb_array_elements(${json(invalidCases)}) loop
    begin
      insert into public.board_listings(id,owner_id,payload) values(target_id,target_owner,fixture.payload);
    exception when check_violation or foreign_key_violation then
      continue;
    end;
    raise exception 'Database incorrectly accepted %',fixture.name;
  end loop;
  select count(*) into imports_before from public.reference_imports;
  select name into name_before from public.reference_countries where code='KE';
  begin
    perform public.sync_reference_snapshot(
      ${json([{ ...country, name: "Atomic rollback test" }])},
      '[{"id":999999999999,"country":"ZZ","name":"Invalid country","lat":0,"lng":0,"pop":15000,"tz":"UTC"}]'::jsonb,
      repeat('1',64), repeat('2',64), null
    );
    raise exception 'Invalid reference import unexpectedly succeeded';
  exception when foreign_key_violation then
    null;
  end;
  if (select name from public.reference_countries where code='KE') is distinct from name_before
     or (select count(*) from public.reference_imports) <> imports_before then
    raise exception 'Failed reference import published partial data or provenance';
  end if;
end $checks$;
rollback;
select jsonb_build_object('listingContracts','passed','invalidCases',${invalidCases.length},'referenceRollback','passed','privateGrants','passed') as verification;
`
process.stdout.write(sql)
