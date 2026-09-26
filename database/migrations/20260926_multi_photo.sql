-- Multi-photo listings store extra URLs in board_listings.payload.images (jsonb).
-- Cover remains payload.image (first photo). No table changes required.
-- Existing single-photo ads keep working; the app treats missing images as [image].
-- Apply nothing beyond this comment if payload already accepts arbitrary jsonb keys.
select 1;
