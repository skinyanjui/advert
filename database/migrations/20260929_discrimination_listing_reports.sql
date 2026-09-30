-- Add a dedicated moderation reason for discriminatory housing/job listings.
-- Apply before deploying the corresponding report-reason application code.

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
      'discrimination',
      'other'
    )
  );
