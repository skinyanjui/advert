-- Structured illegal-content notice fields for moderation review.
alter table public.board_reports
  add column if not exists legal_basis text
    check (legal_basis is null or char_length(legal_basis) <= 1500),
  add column if not exists jurisdiction text
    check (jurisdiction is null or char_length(jurisdiction) <= 120),
  add column if not exists good_faith boolean not null default false;

alter table public.board_reports
  drop constraint if exists board_reports_reason_check;

alter table public.board_reports
  add constraint board_reports_reason_check
  check (
    reason in (
      'spam',
      'scam',
      'prohibited',
      'illegal_content',
      'wrong_category',
      'offensive',
      'undisclosed_promo',
      'other'
    )
  );
