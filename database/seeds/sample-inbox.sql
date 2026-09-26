-- =============================================================================
-- SAMPLE inbox demo data (manual only — NOT a migration)
-- =============================================================================
-- Requires service_role / SQL editor. Anon and authenticated have no grants on
-- board_listings / board_conversations / board_conversation_messages after the
-- lock-listings-reads migration, so the public Supabase key cannot load this.
--
-- SETUP
-- 1. Set seller_id below to ONE of:
--    a) Your Supabase Auth user id:
--         select id, email from auth.users order by created_at desc limit 20;
--    b) Your browser session UUID from the `board_session` cookie
--       (DevTools → Application → Cookies → board_session = <UUID>.<mac>;
--        use only the UUID before the first ".").
-- 2. Run this entire file in the Supabase SQL editor (or psql as postgres).
-- 3. Refresh the site while signed in as that user (or with that cookie) and
--    open /messages — you should see SAMPLE · threads with a mix of unread.
-- 4. Clean up with database/seeds/sample-inbox-remove.sql
--
-- Markers for safe cleanup:
--   - listing ids: ad-sample-inbox-*
--   - titles / listing_title: prefix "SAMPLE ·"
--   - description / message body: contains "[SAMPLE_INBOX]"
--   - conversation ids: a11c0001-… through a11c0004-…
-- =============================================================================

do $seed$
declare
  -- >>> EDIT THIS UUID before running <<<
  seller_id uuid := '00000000-0000-4000-8000-0000000000aa';

  buyer_a uuid := 'b0a10000-0000-4000-8000-0000000000a1';
  buyer_b uuid := 'b0a10000-0000-4000-8000-0000000000a2';
  buyer_c uuid := 'b0a10000-0000-4000-8000-0000000000a3';

  conv_1 uuid := 'a11c0001-0000-4000-8000-000000000001';
  conv_2 uuid := 'a11c0002-0000-4000-8000-000000000002';
  conv_3 uuid := 'a11c0003-0000-4000-8000-000000000003';
  conv_4 uuid := 'a11c0004-0000-4000-8000-000000000004';

  listing_1 text := 'ad-sample-inbox-cruiser';
  listing_2 text := 'ad-sample-inbox-sofa';
  listing_3 text := 'ad-sample-inbox-iphone';

  now_ts timestamptz := now();
  marker text := '[SAMPLE_INBOX]';
begin
  if seller_id = '00000000-0000-4000-8000-0000000000aa'::uuid then
    raise exception
      'Edit seller_id in database/seeds/sample-inbox.sql to your auth user id or board_session UUID before running.';
  end if;

  -- Idempotent: remove any previous sample inbox rows first.
  delete from public.board_conversation_messages
  where conversation_id in (conv_1, conv_2, conv_3, conv_4)
     or body like '%' || marker || '%';

  delete from public.board_conversations
  where id in (conv_1, conv_2, conv_3, conv_4)
     or listing_id like 'ad-sample-inbox-%'
     or listing_title like 'SAMPLE ·%';

  delete from public.board_listings
  where id like 'ad-sample-inbox-%'
     or payload->>'description' like '%' || marker || '%';

  insert into public.board_listings (id, owner_id, posted_at, expires_at, payload)
  values
    (
      listing_1,
      seller_id,
      now_ts - interval '2 days',
      now_ts + interval '58 days',
      jsonb_build_object(
        'id', listing_1,
        'title', 'SAMPLE · Toyota Land Cruiser 79',
        'price', 18500,
        'currency', 'USD',
        'category', 'vehicles',
        'subcategory', 'cars',
        'country', 'KE',
        'city', 'Nairobi',
        'hoursAgo', 48,
        'postedAt', (now_ts - interval '2 days'),
        'image', '/listings/cruiser.jpg',
        'images', jsonb_build_array('/listings/cruiser.jpg'),
        'description', marker || ' Demo ad for seller inbox. Single-owner diesel Cruiser, viewing in Kilimani.',
        'condition', 'Used',
        'sellerName', 'SAMPLE Seller',
        'sellerSince', '2024',
        'phone', '+254 700 000 001',
        'details', jsonb_build_object('make', 'Toyota', 'model', 'Land Cruiser 79')
      )
    ),
    (
      listing_2,
      seller_id,
      now_ts - interval '5 days',
      now_ts + interval '55 days',
      jsonb_build_object(
        'id', listing_2,
        'title', 'SAMPLE · 3-seater living room sofa',
        'price', 220,
        'currency', 'USD',
        'category', 'home',
        'subcategory', 'furniture',
        'country', 'KE',
        'city', 'Nairobi',
        'hoursAgo', 120,
        'postedAt', (now_ts - interval '5 days'),
        'image', '/listings/sofa.jpg',
        'images', jsonb_build_array('/listings/sofa.jpg'),
        'description', marker || ' Demo sofa listing for inbox threads. Firm cushions, minor wear on one arm.',
        'condition', 'Used',
        'sellerName', 'SAMPLE Seller',
        'sellerSince', '2024',
        'phone', '+254 700 000 001'
      )
    ),
    (
      listing_3,
      seller_id,
      now_ts - interval '1 day',
      now_ts + interval '59 days',
      jsonb_build_object(
        'id', listing_3,
        'title', 'SAMPLE · iPhone 13 128GB',
        'price', 380,
        'currency', 'USD',
        'category', 'electronics',
        'subcategory', 'phones',
        'country', 'KE',
        'city', 'Mombasa',
        'hoursAgo', 24,
        'postedAt', (now_ts - interval '1 day'),
        'image', '/listings/iphone.jpg',
        'images', jsonb_build_array('/listings/iphone.jpg'),
        'description', marker || ' Demo phone listing. Battery health 89%, box and cable included.',
        'condition', 'Used',
        'sellerName', 'SAMPLE Seller',
        'sellerSince', '2024',
        'phone', '+254 700 000 001'
      )
    );

  insert into public.board_conversations (
    id, listing_id, listing_owner_id, buyer_id, listing_title, seller_name,
    buyer_last_read_at, seller_last_read_at, created_at, updated_at
  )
  values
    -- Unread for seller: buyer asked after seller last read.
    (
      conv_1, listing_1, seller_id, buyer_a,
      'SAMPLE · Toyota Land Cruiser 79', 'SAMPLE Seller',
      now_ts - interval '3 hours',
      now_ts - interval '1 day',
      now_ts - interval '1 day',
      now_ts - interval '2 hours'
    ),
    -- Read thread: seller already caught up.
    (
      conv_2, listing_1, seller_id, buyer_b,
      'SAMPLE · Toyota Land Cruiser 79', 'SAMPLE Seller',
      now_ts - interval '30 minutes',
      now_ts - interval '20 minutes',
      now_ts - interval '2 days',
      now_ts - interval '30 minutes'
    ),
    -- Unread sofa enquiry.
    (
      conv_3, listing_2, seller_id, buyer_c,
      'SAMPLE · 3-seater living room sofa', 'SAMPLE Seller',
      now_ts - interval '10 minutes',
      null,
      now_ts - interval '6 hours',
      now_ts - interval '10 minutes'
    ),
    -- Seller replied; buyer unread but seller side is read.
    (
      conv_4, listing_3, seller_id, buyer_a,
      'SAMPLE · iPhone 13 128GB', 'SAMPLE Seller',
      now_ts - interval '4 hours',
      now_ts - interval '1 hour',
      now_ts - interval '4 hours',
      now_ts - interval '1 hour'
    );

  insert into public.board_conversation_messages (id, conversation_id, sender_id, body, sent_at)
  values
    -- conv_1: unread buyer follow-up
    (
      'a11c1001-0000-4000-8000-000000000001', conv_1, buyer_a,
      marker || ' Hi — is the Land Cruiser still available this week?',
      now_ts - interval '1 day'
    ),
    (
      'a11c1001-0000-4000-8000-000000000002', conv_1, seller_id,
      marker || ' Yes, still available. You can view it in Kilimani tomorrow.',
      now_ts - interval '20 hours'
    ),
    (
      'a11c1001-0000-4000-8000-000000000003', conv_1, buyer_a,
      marker || ' Great. Can you hold it until Saturday afternoon?',
      now_ts - interval '2 hours'
    ),

    -- conv_2: fully read negotiation
    (
      'a11c1002-0000-4000-8000-000000000001', conv_2, buyer_b,
      marker || ' What is the lowest you would take on the Cruiser?',
      now_ts - interval '2 days'
    ),
    (
      'a11c1002-0000-4000-8000-000000000002', conv_2, seller_id,
      marker || ' Firm at 18,000 USD for a serious buyer this month.',
      now_ts - interval '1 day' - interval '12 hours'
    ),
    (
      'a11c1002-0000-4000-8000-000000000003', conv_2, buyer_b,
      marker || ' Understood — I will confirm after a bank transfer check.',
      now_ts - interval '30 minutes'
    ),

    -- conv_3: unread sofa ping (seller never read)
    (
      'a11c1003-0000-4000-8000-000000000001', conv_3, buyer_c,
      marker || ' Is the sofa still for sale? Can you deliver within Nairobi?',
      now_ts - interval '10 minutes'
    ),

    -- conv_4: seller last reply (read for seller)
    (
      'a11c1004-0000-4000-8000-000000000001', conv_4, buyer_a,
      marker || ' Does the iPhone still have Apple warranty left?',
      now_ts - interval '4 hours'
    ),
    (
      'a11c1004-0000-4000-8000-000000000002', conv_4, seller_id,
      marker || ' About four months left. I can meet near Nyali this evening.',
      now_ts - interval '1 hour'
    );

  raise notice 'SAMPLE inbox seed loaded for seller_id=% (% listings, % conversations)',
    seller_id, 3, 4;
end
$seed$;
