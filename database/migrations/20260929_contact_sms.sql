-- Add SMS/text contact intent analytics.
-- Safe to apply before the application change.

alter table public.board_contact_events
  drop constraint if exists board_contact_events_event_type_check;

alter table public.board_contact_events
  add constraint board_contact_events_event_type_check
  check (
    event_type in ('listing_view', 'whatsapp_click', 'phone_click', 'sms_click', 'message_start')
  );
