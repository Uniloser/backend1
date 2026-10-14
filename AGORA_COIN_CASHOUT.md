# Agora Coins and creator cash accounting

## Accounting model

Reader coins and creator cash earnings are separate balances. A purchase creates a spendable coin balance and a FIFO purchase lot. Only verified, purchase-backed coins can carry attributable cash proceeds into creator earnings. Coins transferred to a writer are useful in the writer's coin wallet, but do not create a new purchase lot and cannot be cashed out a second time.

For RevenueCat purchase events, the backend records eligible net value in integer USD cents using the event's `price`, `tax_percentage`, and `commission_percentage`: `round(price * 100) * (1 - tax - commission)`, rounded down to cents. RevenueCat reports `price` in USD and provides the reported tax and commission percentages; if pricing fields are missing or invalid, the coins are still credited but their eligible cash value is zero until reconciled. This is deliberately conservative and does not infer Google Play proceeds from the coin quantity or a locally advertised price. [RevenueCat taxes and commissions](https://www.revenuecat.com/docs/dashboard-and-metrics/taxes-and-commissions), [RevenueCat webhook event fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).

When coins are spent, their cash value is allocated across remaining purchase lots FIFO. Partial use is rounded down to integer cents; a lot's final use receives its remaining cents so allocations sum exactly to the lot's original eligible value. Default configurable splits are 90% of eligible net proceeds for author tips and 70% for paid chapter unlocks, with the rest recorded as platform revenue. These splits apply after RevenueCat's reported tax and commission deductions, not to the reader's gross spend.

Cash journals use USD cents and balanced debit/credit entries. The ledger preserves transaction IDs, source references, coin amounts, allocation percentages, timestamps and purchase/refund metadata. A refund removes unspent coins. If any part of a purchase lot has already been spent, the refund is flagged for reconciliation; it does not silently rewrite creator earnings. This migration does not yet provide automated creator-liability clawbacks for those previously consumed coins.

## Current cash-out status

Cash-out is disabled by default. The migration stores a proposed K100 minimum, monthly cadence, 7–14 business-day target, fees, FX rate and payout methods as policy data. A local ADMIN control records a manually sourced current bank/provider quote and its server-observed timestamp; no FX feed or transfer provider is integrated. Creator requests are accepted only while policy flags, quote source/rate, methods, and fee policy are configured. RevenueCat purchase or refund webhooks never count as proof of a payout.

Before enabling cash-out, an administrator must verify the current quote directly with a provider that supports Zambia, record its source, choose supported manual methods, verify creator identity and destination ownership for each request, and ensure the actual reserve has funds. ReadAgora covers transfer fees. Approvals and payments are separate: approval reserves actual ZMW cash, and only operator-confirmed transfer reconciliation marks a request paid.

## Routes

Authenticated routes are scoped to the caller's user ID:

- `GET /creator/cash-wallet`
- `GET /creator/cashout/quote`
- `GET /creator/cash-transactions?limit=50`
- `GET /creator/payout-history?limit=50`
- Existing `GET /coins/wallet` and `GET /coins/history?limit=50`
- Existing `POST /coins/support` now requires `{ storyId, coins, idempotencyKey }`
- Existing RevenueCat webhook grants coin packs and processes refunds idempotently

The chapter unlock route still uses the existing server-side RPC and now creates the 70/30 cash journal. There is no public balance-writing or direct payout route.

## Apply and validate

Apply the forward migration `sql/readagora_coin_cash_economy.sql` after `sql/readagora_creator_economy.sql` and `sql/chapter_coin_unlocks.sql`. Deploy the backend and frontend together so the support endpoint's idempotency key and the new wallet screens match the API. The migration includes a disposable PostgreSQL fixture at `scripts/test-coin-cash-economy.sql`; run it only against an isolated throwaway database. No real purchase or payout is needed for the accounting checks.

## Known follow-up

Current table-level permissions keep the financial tables private to service role; the authenticated API reads only rows for the caller. A separate admin-only reconciliation and approval workflow, automatic release from pending to available, provider payout integration, cash-out request endpoint, and refund liability clawback are intentionally not active yet. These are required before any creator cash is withdrawable.

## Manual payout workflow

The additive migration `sql/creator_payout_workflow.sql` implements manual requests, policy configuration, identity attestations, and reconciliation. Apply it after `readagora_coin_cash_economy.sql`; it does not change the existing purchase, tip, or chapter-unlock accounting. The proposed monthly ZMW 2,000 reserve target is policy metadata only. Actual reserve funding must be separately recorded through an admin operation; the target is not treated as cash or creator earnings.

Creator endpoints:

- `POST /creator/payout-requests` accepts `amountZmwMinorUnits`, `payoutMethod`, `destinationReference`, and a UUID `idempotencyKey`. It uses the authenticated user ID, converts the ZMW request using the configured USD/ZMW rate, reserves available USD earnings atomically, and returns only a masked destination.
- `GET /creator/payout-history` returns the caller's history, masked destination, review/failure notes, reserve state, and payment outcome.

Admin endpoints require `app_metadata.role = 'admin'` on the authenticated Supabase user:

- `GET /admin/creator-payouts` lists historical and outstanding requests; destination details are available only to admins.
- `GET /admin/creator-payout-reserve` returns the target, actual available/held reserve, current-month paid total, and recent movements.
- `POST /admin/creator-payout-reserve/fund` records separately funded reserve cash with an idempotency key and reference.
- `POST /admin/creator-payouts/:id/review` approves or rejects with a required audit note. Approval requires an explicit administrator attestation that identity and destination ownership were manually verified. If reserve funds are insufficient, approval remains unpaid in `AWAITING_RESERVE` and can be retried after separately funding the reserve.
- `POST /admin/creator-payouts/:id/start-transfer` marks the start of a manual transfer, never as paid.
- `POST /admin/creator-payouts/:id/reconcile` accepts `uncertain`, `paid`, or `failed`. A confirmed payment requires a transfer reference. Uncertain and failed outcomes do not claim payment; failure releases both creator funds and the held reserve exactly once.

Every request reserves creator USD earnings immediately. Approval also moves the requested ZMW amount from actual available reserve to held reserve. Rejection releases the creator reservation. Confirmed payment removes the creator liability and held reserve. Reserve and creator-account updates are locked and transactional. Full payout destination details are protected by service-role-only database access; creator responses include only the last four characters.

Payout processing remains disabled by default. In the Creator payouts page, a verified administrator can select MTN and/or Airtel, record the current USD/ZMW rate and provider quote source, and explicitly enable or disable new requests. Saving configuration timestamps the quote on the database server and writes a policy audit record. The request RPC refuses requests unless the provider label, positive rate, quote source/timestamp, supported methods, and explicit processing enablement are configured. Non-zero fees keep the quote disabled; fees are currently set to be covered by ReadAgora. The mobile app shows a request form only when the backend-authoritative quote reports enabled. Transfers remain manual. Do not enable real payouts until the migration is reviewed/applied in production, a current bank/provider quote is verified and entered, and actual reserve cash is confirmed.
