# Agora Coin writer support

Apply the updated `sql/readagora_creator_economy.sql` on Supabase before deploying the backend and frontend. Reapplying it is required when the base creator economy tables already exist, because it installs the support RPC and updates the transaction type constraint. If `sql/chapter_coin_unlocks.sql` is part of the database setup, apply its updated file too so its transaction type constraint preserves `SUPPORT_RECEIVED`.

On a story page, a signed-in reader can send 10, 50, 120, or 300 coins, subject to their current balance. The API rechecks the published story author and wallet inside one database transaction. It prevents self-support and insufficient-balance transfers. A successful transfer deducts the reader's wallet, credits the author's wallet, adds linked `SUPPORT_SENT` and `SUPPORT_RECEIVED` transactions, and creates a `coin_support_events` record for Creator Center analytics.

Coins remain in-app currency. Writer support does not create a cash earnings entry and cannot be withdrawn. Store purchase confirmation and chapter coin unlocks are otherwise unchanged.
