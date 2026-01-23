repair-covers-batch.mjs

Purpose

This script performs an in-repo, server-side batch repair of product covers. It selects products where `image_url` is missing or does not contain `P00.jpg`, picks a candidate image from the `images` array (prefers `P00.jpg`), and updates `products.image_url` in batches.

Usage

1. Dry-run (no DB writes, can run without service role keys):

```bash
node scripts/repair-covers-batch.mjs --batch=500 --dry-run
```

2. Real run (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in env):

```bash
export SUPABASE_URL="https://xyz.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="service-role-..."
node scripts/repair-covers-batch.mjs --batch=1000
```

Flags

- `--batch` (default 1000): number of rows to fetch per iteration.
- `--dry-run`: only computes candidates and prints preview; no DB writes.

Notes and Recommendations

- The script first attempts a bulk UPDATE using the project's `execute_sql` RPC. If that RPC is unavailable or fails, it falls back to updating rows individually using the Supabase client.
- For very large tables, run with small `--batch` (e.g. 500) and monitor DB load.
- Always run the provided preview SQL (`scripts/preview-repair.sql`) before applying changes in production.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secure and never expose it to the browser.

If you want, I can:

- Add a paginated endpoint that previews N IDs before applying.
- Modify the "torre de controle" page to surface "Large images detected" and a per-product resize action.
- Generate a batch script that processes exactly X rows per cron job and logs progress to `sync_jobs`.
