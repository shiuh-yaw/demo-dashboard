# Codebase Concerns

**Analysis Date:** 2026-03-31

## Tech Debt

**Incomplete Solana Wallet Support:**
- Issue: Solana WalletConnect runtime is not shipped in SDK v0.6.0. Multiple TODOs block Solana wallet integration.
- Files: `apps/checkouts/lib/dynamicClient.ts`, `apps/checkouts/components/payment-modal/wallet-selector-screen.tsx`
- Impact: Users cannot connect Solana wallets via WalletConnect. Reduces functionality for Solana ecosystem.
- Fix approach: Track Dynamic SDK v0.6.x release that ships `@dynamic-labs-sdk/solana/wallet-connect` runtime bundle. Then enable `addWalletConnectSolanaExtension` and uncomment the chainSelect flow in wallet selector.

**Hardcoded Chain Names:**
- Issue: Chain ID to name mapping is hardcoded in `getChainName()` function instead of using centralized config.
- Files: `apps/dashboard/src/app/checkouts/components/management/users-tab.tsx` (line 215-227)
- Impact: Adding new chains requires code changes and testing. Missing chains silently return generic "Chain XXX" fallback.
- Fix approach: Move chain definitions to a shared config file (e.g., `src/lib/config/chains.ts`) that both dashboard and checkouts apps import from.

**Kraken Withdrawal Info API Unimplemented:**
- Issue: Kraken's `WithdrawInfo` API for withdrawal validation is not integrated.
- Files: `apps/checkouts/components/payment-widget/screens/review-screen.tsx` (line 104)
- Impact: Cannot validate withdrawal address correctness, fee estimates, or minimum/maximum amounts before execution.
- Fix approach: Implement wrapper around Kraken's `POST /0/private/WithdrawInfo` endpoint to validate withdrawal parameters before submission.

**Missing Phone Number from Coinbase Credentials:**
- Issue: Phone number extraction from verified credentials is not implemented.
- Files: `apps/dashboard/src/app/api/coinbase/onramp/route.ts` (line 21)
- Impact: Cannot populate full user profile for Coinbase onramp flow. May require manual data entry.
- Fix approach: Extract phone number from Dynamic SDK verified_credentials when available, with fallback to API request parameter.

**Redundant Data Fetching:**
- Issue: Settings page fetches checkout config without deduplication, potentially causing duplicate requests.
- Files: `apps/dashboard/src/app/checkouts/[id]/settings/page.tsx` (line 19)
- Impact: Unnecessary requests to backend and increased latency on page load.
- Fix approach: Use React `cache()` to deduplicate fetch calls between layout and page components.

## Known Bugs

**External JWT Sign-in Timing Issue (FIXED):**
- Context: Fixed in commit e12638d. Previously `signInWithExternalJwt` did not wait for client initialization.
- Files: `apps/remittance/app/(auth)/login/page.tsx`, `apps/remittance/app/r/[id]/(auth)/login/page.tsx`
- Status: RESOLVED - now waits for client initialization before sign-in.

## Security Considerations

**Weak Unauthenticated API Endpoints:**
- Risk: Public POST /api/checkouts/[id]/transactions endpoint allows unrestricted transaction initialization. No rate limiting or request verification.
- Files: `apps/dashboard/src/app/api/checkouts/[id]/transactions/route.ts` (lines 29-46)
- Current mitigation: Checkout IDs and externalIds are obfuscated/random (CUID2). This is weak security—determined attackers can enumerate IDs.
- Recommendations: 
  1. Implement rate limiting per IP/checkout ID (consider Upstash rate limit)
  2. Add CAPTCHA for unauthenticated endpoints
  3. Log suspicious activity patterns (high request volume, rapid ID enumeration)
  4. Consider moving to authenticated-only POST with public GET for status checks

**QStash Webhook Validation:**
- Risk: `/api/internal/worker` verifies QStash signature but silently passes through if signature header is missing (line 21). Missing signature is treated as valid.
- Files: `apps/dashboard/src/app/api/internal/worker/route.ts`
- Current mitigation: If signature check is missing, isValid defaults to true (implicit pass).
- Recommendations:
  1. Reject requests with missing signature in production
  2. Add environment-specific behavior (only allow missing signatures in development)
  3. Log all webhook verification failures

**Missing Input Validation in JSON Parsing:**
- Risk: Multiple endpoints use `await request.json().catch(() => ({}))` to suppress parse errors, defaulting to empty object.
- Files: `apps/dashboard/src/app/api/checkouts/[id]/transactions/route.ts` (line 35), `apps/remittance/components/screens/settings-screen.tsx`, multiple others
- Current mitigation: Zod schema validation catches malformed input downstream, but empty object {} passes through.
- Recommendations:
  1. Require explicit try-catch with error logging, don't silently default to {}
  2. Return 400 Bad Request for unparseable JSON instead of continuing with empty data
  3. Audit all endpoints for this pattern and fix systematically

## Performance Bottlenecks

**Large Component Files:**
- Problem: Several components exceed 600+ lines, making them difficult to debug and modify. Increased risk of unrelated changes affecting behavior.
- Files: 
  - `apps/remittance/components/admin/user-list.tsx` (1192 lines)
  - `apps/checkouts/lib/dynamicClient.ts` (916 lines)
  - `apps/checkouts/components/payment-modal/wallet-selector-screen.tsx` (646 lines)
  - `apps/wallet/components/screens/send-tx-screen.tsx` (655 lines)
- Cause: Multiple concerns bundled (state management, rendering, API calls, business logic) in single files.
- Improvement path:
  1. Extract state management into custom hooks (e.g., `useUserListState`)
  2. Extract API calls into separate service modules
  3. Split rendering into smaller sub-components
  4. Aim for <400 lines per file with clear responsibility

**Missing Promise Chain Cleanup:**
- Problem: Several files use `.then().catch()` chains instead of async/await, making error propagation implicit and harder to track.
- Files: 
  - `apps/deposit/components/deposit-screen.tsx`
  - `apps/remittance/components/layouts/app-shell.tsx`
  - `apps/trade/app/(app)/earn/components/vault-modal.tsx`
- Cause: Incremental development without refactoring.
- Improvement path:
  1. Convert to async/await for clarity
  2. Centralize error handling
  3. Make unhandled promise rejections explicit

**Multiple Sequential API Calls Without Caching:**
- Problem: `/api/admin/users` endpoint is called repeatedly without request deduplication or client-side caching.
- Files: `apps/remittance/components/admin/user-list.tsx` (line 140-145 refreshUsers callback)
- Cause: No cache layer; each search triggers new fetch.
- Improvement path:
  1. Implement request deduplication (React Query, SWR, or similar)
  2. Add client-side cache with TTL (e.g., 30 seconds)
  3. Only invalidate cache when user actions trigger updates

## Fragile Areas

**State Machine Implementation Relies on Service Methods:**
- Files: `apps/dashboard/src/lib/services/redis/transactions.ts`
- Why fragile: State transitions are enforced by service layer, but no explicit state validation occurs on reads. If a transaction record is corrupted or modified externally, subsequent operations may fail silently.
- Safe modification: 
  1. Add validation in service `get()` method to ensure state is valid
  2. Add logging for unexpected state transitions
  3. Implement transaction state auditing
- Test coverage: No unit tests found for state machine transitions. Critical for correctness.

**Manual Debouncing in Search:**
- Files: `apps/remittance/components/admin/user-list.tsx` (line 131, 148-155)
- Why fragile: Using useRef + setTimeout for debouncing is error-prone. Race conditions possible if component unmounts during pending debounce, or if multiple searches are triggered.
- Safe modification:
  1. Use a dedicated debounce hook or library (lodash debounce)
  2. Add cleanup in useEffect to clear pending timeouts
  3. Add loading state to disable search input during requests
- Test coverage: No tests for debounce behavior or race conditions.

**Dynamic SDK Client Initialization:**
- Files: `apps/checkouts/lib/dynamicClient.ts` (line 140-159)
- Why fragile: Singleton pattern with implicit SSR guards. Multiple code paths check `if (!_client) return null/[]/{}/Promise.resolve()`. Easy to miss a guard and cause hydration mismatches.
- Safe modification:
  1. Make SSR guard explicit in a single utility function
  2. Add console warnings when SDK methods are called during SSR (dev only)
  3. Centralize fallback values in constants
- Test coverage: No tests for SSR behavior or hydration edge cases.

**Type Assertions Without Validation:**
- Files: 
  - `apps/deposit/lib/webhooks/fireblocks/handlers/transaction-status-updated.ts` (tx as unknown as Record)
  - `apps/remittance/app/api/handlers/transactions-history.ts` (JSON.parse as unknown)
- Why fragile: Type assertions bypass TypeScript checking. If webhook payload structure changes, code silently fails or crashes.
- Safe modification:
  1. Replace with proper Zod/io-ts validation
  2. Log validation errors and reject invalid payloads
  3. Add schema versioning for webhook payloads
- Test coverage: No validation tests for webhook payloads.

## Scaling Limits

**Redis as Single Source of Truth:**
- Current capacity: ioredis local or Upstash REST API. No persistence layer (data loss on restart for local Redis).
- Limit: Single Redis instance/Upstash account may have throughput limits. No replication or failover.
- Scaling path:
  1. For production: Use Upstash with automatic failover
  2. Add write-through cache (e.g., PostgreSQL) for transaction audit trail
  3. Implement circuit breaker for Redis failures with fallback to cache layer

**QStash Concurrency:**
- Current capacity: Default QStash account rate limits (likely 100+ messages/sec for standard plan).
- Limit: High transaction throughput (1000+ TPS) could exceed QStash limits and cause queue backlogs.
- Scaling path:
  1. Monitor QStash queue depth and latency
  2. Batch status checks (poll multiple txs per message)
  3. Implement exponential backoff more aggressively to reduce queue load
  4. Consider multi-queue setup for geographic distribution

**Database-less Transaction History:**
- Current capacity: All transaction state in Redis only. No persistent audit log or long-term analytics.
- Limit: Cannot efficiently query historical transactions, perform analytics, or recover from Redis outages.
- Scaling path:
  1. Add PostgreSQL with sync-on-write from Redis
  2. Archive old transactions (>30 days) to cold storage
  3. Implement transaction search/filtering on PostgreSQL layer

## Dependencies at Risk

**Dynamic SDK Major Version Dependency:**
- Risk: `@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/evm`, `@dynamic-labs-sdk/solana` are at v0.6.0. Solana WalletConnect runtime missing.
- Impact: Cannot fully support Solana wallets. Blocks user acquisition in Solana ecosystem.
- Migration plan:
  1. Monitor Dynamic SDK changelog for v0.6.x or v0.7.0 release
  2. Test Solana WalletConnect in staging environment
  3. Enable feature flag in code (already present as TODO)
  4. No breaking changes expected; upgrade should be additive

**LI.FI Integration Tight Coupling:**
- Risk: Swap provider logic is tightly coupled to LI.FI API. Relay.link or other providers not abstracted.
- Impact: Switching providers requires code changes across multiple files. Custom error handling breaks on provider change.
- Migration plan:
  1. Create `SwapProvider` abstract interface
  2. Implement adapters for LI.FI and Relay (parallel)
  3. Route requests through provider factory based on config
  4. See ARCHITECTURE.md for proposed abstraction

**Upstash Dependency (Optional but Important):**
- Risk: `@upstash/redis` and QStash are optional in dev but required in production. No graceful fallback.
- Impact: Production deployment fails if Upstash credentials are missing or service is down.
- Migration plan:
  1. Add Upstash service health check in startup
  2. Implement fallback to local Redis if Upstash is unavailable
  3. Add circuit breaker with fallback storage (PostgreSQL)
  4. Document fallback behavior in operations guide

## Missing Critical Features

**No Persistent Audit Log:**
- Problem: Transaction lifecycle events are not persisted. Redis-only storage means no recovery from outages.
- Blocks: Cannot implement transaction dispute resolution, regulatory compliance (audit trail), fraud detection.
- Recommendation: Add PostgreSQL for write-through logging. Implement event log with timestamp, actor, change, and reason fields.

**No Rate Limiting on Public APIs:**
- Problem: Public transaction endpoints have no request throttling per IP, checkout, or global limit.
- Blocks: DDoS protection. Prevents abuse of free API endpoints. Cannot implement fair usage policies.
- Recommendation: Add Upstash rate limiter. Start with per-IP/per-checkout-ID limiting. Provide paid tier with higher limits.

**No Transaction Search/Analytics:**
- Problem: Cannot query transaction history by date range, status, amount, user, or other criteria.
- Blocks: Dashboard analytics, fraud detection, customer support (finding transactions), reconciliation.
- Recommendation: Add PostgreSQL with indexed transaction table. Implement search API with pagination. Add dashboard analytics widgets.

**No Webhook Retry Logic:**
- Problem: Webhook handlers process once. If processing fails, event is lost.
- Blocks: Reliable event processing. Current system assumes all webhooks succeed on first attempt.
- Recommendation: Implement exponential backoff in webhook handlers. Store webhook events in transaction log and replay on failure.

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Service layer (Redis, LI.FI, BlindPay), validation schemas, error handling, state machine transitions.
- Files: 
  - `apps/dashboard/src/lib/services/redis/transactions.ts`
  - `apps/dashboard/src/lib/validation/`
  - `apps/dashboard/src/lib/services/lifi.ts`
- Risk: State machine bugs, validation bypass, API contract violations go undetected until production.
- Priority: HIGH - Add Jest tests with >80% coverage for service layer.

**No Integration Tests:**
- What's not tested: API endpoint behavior (auth, validation, error responses), payment flow end-to-end, webhook handling.
- Risk: API changes break consumers. Auth bypass possible. Webhook failures silent.
- Priority: HIGH - Add Vitest integration tests for critical API endpoints.

**No E2E Tests:**
- What's not tested: Checkout page flow, payment widget rendering, transaction success/failure paths.
- Risk: UI rendering regressions, user flow breaks, hidden JavaScript errors in production.
- Priority: MEDIUM - Add Playwright E2E tests for critical user journeys.

**No Type Safety Tests:**
- What's not tested: TypeScript types are compiled but not validated against runtime data.
- Risk: Schema changes break type assumptions silently. API contract violations possible.
- Priority: MEDIUM - Add runtime type validation with io-ts or Zod integration tests.

---

*Concerns audit: 2026-03-31*
