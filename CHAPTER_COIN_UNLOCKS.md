# Chapter coin unlocks

Apply `sql/chapter_coin_unlocks.sql` to Supabase **before deploying the backend or frontend**. It depends on the existing discovery, premium access, comic, and creator economy migrations. This migration has been tested locally; it is not automatically applied to your deployed database.

The existing story settings determine which published chapters are Premium (including the minimum free preview). Authors retain access to their own work. Other readers can read free chapters, use an active/ grace-period Premium subscription, or own a permanent chapter unlock. Unlocks remain on the account after a subscription expires; publication, moderation, and story visibility checks still apply.

Chapter prices are controlled in the database: `chapters.coin_price`, initially 5 coins. Change prices through trusted administration, not a client debit amount. The client sends `expectedPrice` only to reject a changed quote. The debit always uses the locked database row's price.

- `GET /chapters/:id/access` (authenticated): current access, price and wallet balance; no content.
- `POST /chapters/:id/unlock` (authenticated): `{ "expectedPrice": 5 }`. Returns access, amount charged, reason and, for coin unlocks, the authoritative balance.
- Existing chapter reads, chapter lists and comic panel reads recognize permanent unlocks.

The database function checks free/author/Premium access before spending, locks the chapter and wallet, and atomically writes the wallet debit, permanent ownership and `CHAPTER_UNLOCK` ledger entry. The unique user/chapter key and locked recheck make retries idempotent. Unavailable chapters, changed prices and insufficient balances do not charge coins. Direct client grants, debits and premium story content reads are restricted; the backend remains the access authority. Premium chapter bodies are excluded from the shared frontend chapter cache.

This change keeps `SUPPORT_SENT` and writer-support records separate. It does not introduce a tipping endpoint or a creator cash-conversion rate.

## Validation

Use an isolated, disposable PostgreSQL cluster, never a real application database. `scripts/test-chapter-coin-unlocks.sql` creates a minimal fixture schema and roles and applies the actual migration. It verifies free/Premium access, paid unlocks, duplicate requests, price changes, insufficient funds, unpublished chapters, ownership isolation, RPC permissions, direct-read protection and full rollback on a ledger failure.

Run with `psql -v ON_ERROR_STOP=1 -f scripts/test-chapter-coin-unlocks.sql`. Then run `pgbench -n -c 8 -j 4 -t 3 -f scripts/test-chapter-coin-unlocks-concurrent.sql` against that same fixture database. All 24 requests should succeed with exactly one ledger debit for chapter `20000000-0000-4000-8000-000000000007`, one unlock and a final reader balance of zero.

After deployment, test the reader with a free account, active Premium account, insufficient balance, expired subscription with a prior unlock, and an interrupted/retried unlock. Buying more coins returns to the gate and refreshes the backend balance. No production migration, purchase or unlock was performed by the local tests.
