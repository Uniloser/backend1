# Agora Coins and creator cash accounting

## Accounting model

Reader coins and creator cash earnings are separate balances. A purchase creates a spendable coin balance and a FIFO purchase lot. Only verified, purchase-backed coins can carry attributable cash proceeds into creator earnings. Coins transferred to a writer are useful in the writer's coin wallet, but do not create a new purchase lot and cannot be cashed out a second time.

For RevenueCat purchase events, the backend records eligible net value in integer USD cents using the event's `price`, `tax_percentage`, and `commission_percentage`: `round(price * 100) * (1 - tax - commission)`, rounded down to cents. RevenueCat reports `price` in USD and provides the reported tax and commission percentages; if pricing fields are missing or invalid, the coins are still credited but their eligible cash value is zero until reconciled. This is deliberately conservative and does not infer Google Play proceeds from the coin quantity or a locally advertised price. [RevenueCat taxes and commissions](https://www.revenuecat.com/docs/dashboard-and-metrics/taxes-and-commissions), [RevenueCat webhook event fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).

When coins are spent, their cash value is allocated across remaining purchase lots FIFO. Partial use is rounded down to integer cents; a lot's final use receives its remaining cents so allocations sum exactly to the lot's original eligible value. Default configurable splits are 90% of eligible net proceeds for author tips and 70% for paid chapter unlocks, with the rest recorded as platform revenue. These splits apply after RevenueCat's reported tax and commission deductions, not to the reader's gross spend.

Cash journals use USD cents and balanced debit/credit entries. The ledger preserves transaction IDs, source references, coin amounts, allocation percentages, timestamps and purchase/refund metadata. A refund removes unspent coins. If any part of a purchase lot has already been spent, the refund is flagged for reconciliation; it does not silently rewrite creator earnings. This migration does not yet provide automated creator-liability clawbacks for those previously consumed coins.

## Current cash-out status

Cash-out is disabled by default. The migration stores a proposed K100 minimum, monthly cadence, 7–14 business-day target, fees, FX rate and payout methods as policy data, but no payout provider or FX source has been verified/configured. No withdrawal can be requested or marked paid through this implementation. RevenueCat purchase or refund webhooks never count as proof of a payout. Pending creator earnings remain in USD cents until an approved release/reconciliation process is added.

Before enabling cash-out, ReadAgora must choose a provider that supports Zambia, verify creator identity and destination ownership, set current USD/ZMW FX data with an observed timestamp, configure fee responsibility and supported methods, and implement approval, reserve, release, provider confirmation, failure and reversal workflows. Do not turn the policy flag on until those controls and the payout request API are implemented and reviewed.

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
