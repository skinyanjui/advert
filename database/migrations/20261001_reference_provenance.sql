-- Add explicit provenance to reference imports.
alter table public.reference_imports
  add column if not exists source_url text,
  add column if not exists license text,
  add column if not exists content_hash text,
  add column if not exists generated_at timestamptz;

update public.reference_imports
set content_hash = source_version
where content_hash is null;
