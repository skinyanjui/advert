-- =============================================================================
-- Remove SAMPLE inbox demo data (manual only — NOT a migration)
-- =============================================================================
-- Run with service_role / SQL editor. Safe to re-run.
-- Deletes every row tagged for the sample inbox seed:
--   - listing ids ad-sample-inbox-*
--   - titles / listing_title starting with "SAMPLE ·"
--   - payloads / message bodies containing "[SAMPLE_INBOX]"
--   - fixed conversation / message UUIDs from sample-inbox.sql
-- Does not require seller_id — cleans all SAMPLE inbox rows for every owner.
-- =============================================================================

do $cleanup$
declare
  marker text := '[SAMPLE_INBOX]';
  removed_messages int;
  removed_conversations int;
  removed_listings int;
begin
  delete from public.board_conversation_messages
  where conversation_id in (
      'a11c0001-0000-4000-8000-000000000001'::uuid,
      'a11c0002-0000-4000-8000-000000000002'::uuid,
      'a11c0003-0000-4000-8000-000000000003'::uuid,
      'a11c0004-0000-4000-8000-000000000004'::uuid
    )
     or id::text like 'a11c100%-0000-4000-8000-%'
     or body like '%' || marker || '%';
  get diagnostics removed_messages = row_count;

  delete from public.board_conversations
  where id in (
      'a11c0001-0000-4000-8000-000000000001'::uuid,
      'a11c0002-0000-4000-8000-000000000002'::uuid,
      'a11c0003-0000-4000-8000-000000000003'::uuid,
      'a11c0004-0000-4000-8000-000000000004'::uuid
    )
     or listing_id like 'ad-sample-inbox-%'
     or listing_title like 'SAMPLE ·%';
  get diagnostics removed_conversations = row_count;

  delete from public.board_listings
  where id like 'ad-sample-inbox-%'
     or coalesce(payload->>'title', '') like 'SAMPLE ·%'
     or coalesce(payload->>'description', '') like '%' || marker || '%';
  get diagnostics removed_listings = row_count;

  raise notice 'SAMPLE inbox removed: % messages, % conversations, % listings',
    removed_messages, removed_conversations, removed_listings;
end
$cleanup$;
