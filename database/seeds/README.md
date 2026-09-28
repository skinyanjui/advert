# Manual SQL seeds

These files are **not** migrations and are never applied automatically.

| File | Purpose |
| --- | --- |
| `sample-inbox.sql` | Demo ads + buyer/seller threads for `/messages` |
| `sample-inbox-remove.sql` | Deletes every SAMPLE inbox row |

Run them in the Supabase SQL editor (or `psql`) with a role that bypasses RLS (service role / postgres). Client keys cannot write board tables after `20260926_lock_listings_reads.sql`.
