# Pitfalls Research

**Domain:** Crypto shopping demo with Dynamic SDK headless checkout
**Researched:** 2026-03-31
**Confidence:** HIGH (based on reference implementation analysis + domain research)

## Critical Pitfalls

### Pitfall 1: Double-Initializing the Dynamic Client in React Strict Mode

**What goes wrong:**
React 18/19 Strict Mode calls effects twice in development. If `createDynamicClient` and `initializeClient` run without a guard, the SDK initializes twice, causing undefined behavior -- duplicate event listeners, stale client references, or outright crashes.

**Why it happens:**
Developers write a `useEffect(() => { createDynamicClient(...); initializeClient(); }, [])` without an idempotency guard. Strict Mode re-runs it. The SDK does not inherently deduplicate `createDynamicClient` calls.

**How to avoid:**
Use a module-level `let initialized = false` guard (exactly as the reference implementation does in `dynamicClient.ts`). Wrap it in a dedicated `initializeDynamicClient()` function that short-circuits on re-entry. Additionally, use a `useRef` boolean inside the provider component to prevent double invocation from Strict Mode effect re-runs.

**Warning signs:**
- Console shows "SDK already initialized" warnings
- `getDefaultClient()` throws or returns stale state
- Wallet providers list flickers or appears empty intermittently

**Phase to address:**
Phase 1 (SDK setup / DynamicClientProvider) -- this must be correct from the start.

---

### Pitfall 2: Not Waiting for `waitForClientInitialized` Before Rendering Checkout UI

**What goes wrong:**
Components call `getAvailableWalletProvidersData`, `getWalletAccounts`, or `createCheckoutTransaction` before the SDK client finishes async initialization. These calls either throw or return empty data silently.

**Why it happens:**
`initializeClient()` is async. Developers render the checkout widget immediately without gating on readiness. The SDK functions depend on internal state that only exists after initialization completes.

**How to avoid:**
Create a `DynamicClientProvider` that calls `waitForClientInitialized()` and renders a loading state until it resolves. All checkout components must be children of this provider. Use a React Query wrapper with `staleTime: Infinity` so the check only runs once.

**Warning signs:**
- Empty wallet provider list on first render that "fixes itself" after a few seconds
- `createCheckoutTransaction` fails intermittently on fast page loads
- Works in dev (slower) but breaks in production (faster hydration)

**Phase to address:**
Phase 1 (SDK setup) -- foundational provider must gate all downstream UI.

---

### Pitfall 3: Treating the 5-Step Checkout as Linear When It Has Branching States

**What goes wrong:**
Developers model the checkout as a simple linear wizard (create -> attach -> review -> submit -> status). But the transaction has a real state machine with branching: users can go back from review to token selection, transactions can expire mid-flow, wallet rejections need special handling, and page refreshes need to restore the correct view from persisted state.

**Why it happens:**
The happy path looks linear. Edge cases (expiry, rejection, page refresh, network change) break the linear assumption. The reference implementation handles this with `deriveViewFromTransaction()` which maps execution/settlement states back to the correct view.

**How to avoid:**
- Implement a `deriveViewFromTransaction()` function that maps `executionState` + `settlementState` to the correct UI view
- Persist `transactionId` to localStorage so page refreshes can restore state
- Handle terminal states (`cancelled`, `expired`, `failed`) by showing status view with "Start Over" action
- Handle wallet rejection specifically (check `error.message.includes('rejected')`) and cancel the transaction

**Warning signs:**
- Page refresh shows "Create" view when a transaction is already in progress
- User rejects wallet popup and gets stuck on a spinner
- Expired transaction shows stale quote instead of error

**Phase to address:**
Phase 3 (checkout flow) -- must be designed from the start, not bolted on.

---

### Pitfall 4: Quote Staleness and Price Volatility During Review

**What goes wrong:**
A quote is fetched, the user takes 30+ seconds to review, and by the time they confirm, the quote has expired or the price has moved significantly. The transaction either fails silently or succeeds at an unexpected rate.

**Why it happens:**
Crypto prices are volatile. Quotes from bridging/swap providers have short TTLs (often 30-60 seconds). Unlike traditional checkout where the price is locked, crypto quotes are ephemeral.

**How to avoid:**
- Display the `estimatedTimeSec` from the quote to set expectations
- Show the quote expiry or auto-refresh it on a timer
- On the review screen, make the "Confirm" button re-validate or refetch if the quote is stale
- Show fees prominently (the reference does `totalFeeUsd`) so users are not surprised

**Warning signs:**
- Transaction submission fails with "quote expired" errors
- Users report paying different amounts than shown on review screen
- Submit view spinner hangs indefinitely after quote timeout

**Phase to address:**
Phase 3 (checkout flow, specifically the ReviewQuoteView).

---

### Pitfall 5: Cart Total Desync from Checkout Transaction Amount

**What goes wrong:**
The cart state (React state with items/quantities) gets out of sync with the `createCheckoutTransaction` amount. User adds an item after creating the transaction, or removes an item but the checkout still references the old total.

**Why it happens:**
Cart state and checkout transaction are two independent systems. The cart is local React state; the transaction is a server-side resource created via `createCheckoutTransaction`. There is no automatic binding between them.

**How to avoid:**
- Freeze the cart when entering checkout (disable add/remove)
- Calculate the total at the moment of `createCheckoutTransaction` and display it from the transaction object, not from cart state
- If the user navigates back to cart and modifies it, cancel the existing transaction and require a new one
- Consider a "Cart -> Order Summary (frozen) -> Checkout" flow with a clear point of no return

**Warning signs:**
- Cart shows $25 but checkout widget shows $20 (stale amount)
- User modifies cart during checkout and the transaction succeeds for the wrong amount
- "Amount" displayed in the checkout header does not match cart total

**Phase to address:**
Phase 2 (cart) and Phase 3 (checkout integration) -- the contract between cart and checkout must be defined early.

---

### Pitfall 6: Ignoring the Two-Phase Approval + Transaction Pattern in Submit

**What goes wrong:**
Token transfers on EVM chains often require two wallet interactions: an ERC-20 approval transaction, then the actual transfer/swap transaction. Developers show a single "Confirming..." spinner and the user sees two wallet popups, panics, or rejects the second one thinking it is a duplicate.

**Why it happens:**
`submitCheckoutTransaction` fires `onStepChange` with `'approval'` then `'transaction'` steps. If the UI does not communicate this two-step process, users are confused by multiple wallet prompts.

**How to avoid:**
- Use the `onStepChange` callback to show distinct messages: "Approve token spending in your wallet..." vs "Sign the payment transaction..."
- The reference implementation does this with a simple `step` state that switches the status message
- Never show a generic "Processing..." when the user needs to take action in their wallet

**Warning signs:**
- Users report "I had to sign twice, is that normal?"
- High rate of second-step rejections
- Support tickets about "transaction stuck" when it is actually waiting for the second wallet approval

**Phase to address:**
Phase 3 (submit transaction view).

---

### Pitfall 7: Polling Transaction Status Without Timeout or Backoff

**What goes wrong:**
After submitting a transaction, the app polls `getCheckoutTransaction` forever. If the transaction is stuck (bridge delay, network congestion), the user stares at a spinner indefinitely. Or, aggressive polling hammers the API with requests.

**Why it happens:**
Developers set `refetchInterval: 3000` without a timeout. Cross-chain transactions can take minutes to hours. The reference implementation sets a `POLL_TIMEOUT_MS = 15000` and then shows a manual "Check Status" button.

**How to avoid:**
- Set a polling timeout (15-30 seconds is reasonable for a demo)
- After timeout, stop auto-polling and show a "Check Status" button for manual refresh
- Check for terminal states (`cancelled`, `expired`, `failed` for execution; `completed`, `failed` for settlement) and stop polling immediately
- Show progress indicators for settlement sub-states (`bridging`, `swapping`, `settling`, `routing`)

**Warning signs:**
- Network tab shows hundreds of GET requests for the same transaction
- Users report the app "freezes" or "keeps loading forever"
- API rate limit errors in console

**Phase to address:**
Phase 3 (transaction status view).

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded checkoutId | Skip backend setup for demo | Cannot demonstrate multi-product checkout | Always for this demo (single checkout config is fine) |
| No transaction persistence beyond localStorage | Simpler implementation | Lose state on browser clear / incognito | Always for this demo (fire-and-forget per PROJECT.md) |
| Only supporting first connected wallet `walletAccounts[0]` | Simpler code path | Cannot handle multi-wallet scenarios | Always for this demo (single wallet is the expected flow) |
| Skipping quote refresh timer | Fewer moving parts | Quote may be stale on slow reviewers | Acceptable for MVP, add in polish phase |
| No error boundary around checkout widget | Faster initial development | SDK errors crash entire page | Never -- wrap checkout in error boundary from day 1 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `createDynamicClient` | Passing `autoInitialize: true` and also calling `initializeClient()` manually | Set `autoInitialize: false` and call `initializeClient()` explicitly so you control timing |
| Chain extensions (`addEvmExtension`, etc.) | Adding extensions before `createDynamicClient` | Call `createDynamicClient` first, then add extensions, then `initializeClient()` |
| `attachCheckoutTransactionSource` | Forgetting to get `networkData` for the `fromChainId` field | Call `getActiveNetworkData({ walletAccount })` first to get the correct chain ID |
| `getCheckoutTransactionQuote` | Not passing `fromTokenAddress` after token selection | Token address must flow from the token list selection into the quote request |
| `submitCheckoutTransaction` | Not passing `walletAccount` (passing wallet address string instead) | Pass the full `WalletAccount` object from `getWalletAccounts()` |
| `useClientState` / `useSyncExternalStore` | Using `useState` + `useEffect` with `onEvent` instead | Use `useSyncExternalStore` with the SDK's `onEvent`/`getSnapshot` pattern for tear-free reads |
| SDK version alignment | Mixing `@dynamic-labs-sdk/client@0.12.0` with `@dynamic-labs-sdk/evm@0.11.x` | All `@dynamic-labs-sdk/*` packages must be on the exact same version |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-fetching token balances on every render | Spinner flicker on token list, excessive RPC calls | Use React Query with a stable `queryKey` including `walletAccount.id`; set reasonable `staleTime` | Immediately visible with multiple tokens |
| Not memoizing wallet providers filter | `useWalletProviders` triggers re-render cascade | Use `useSyncExternalStore` pattern (not useState+useEffect) as reference implementation does | Noticeable with 5+ wallet providers |
| Fetching all chain extensions even if only supporting EVM | Larger bundle, slower initialization | Only import the chain extensions you actually need | Bundle size grows 50-100KB per unused extension |
| Polling without terminal state check | API calls continue after transaction completes | Check execution and settlement states against terminal arrays before continuing poll | Wastes bandwidth; could hit rate limits on sustained use |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `checkoutId` that maps to a real merchant account with real funds | Real money could be spent in a demo context | Use a dedicated test/sandbox Dynamic environment; verify the environment ID is for testnet |
| Not validating transaction amount on checkout creation | User could manipulate client-side cart to pay $0.01 | For demo this is acceptable (no backend validation), but document it clearly as a demo limitation |
| Storing sensitive SDK config in client-side code | Environment IDs are public by design, but API keys are not | Never put secret keys in frontend; Dynamic's `environmentId` is designed to be public |
| Trusting client-side balance checks for payment validation | User could fake having sufficient balance | The SDK and backend handle actual balance validation during submission; do not add client-side-only balance gates that could desync |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state between cart and checkout | User clicks "Pay" and nothing happens for 2-3 seconds while transaction is created | Show immediate loading indicator on the pay button; disable it during `createCheckoutTransaction` |
| Showing raw error messages from SDK | User sees "Error: CALL_EXCEPTION" or hex data | Map common error patterns to human-readable messages ("Transaction was rejected", "Insufficient balance", "Network error -- please try again") |
| No way to cancel mid-checkout | User is stuck if they change their mind after connecting wallet | Show "Cancel" button on attachSource, reviewQuote, and submit views (as reference implementation does) |
| Not showing which network/chain the payment will use | User connects wallet on wrong chain, transaction fails | Display chain name and icon next to wallet address; show network switcher if multiple networks available |
| Empty wallet providers list with no explanation | User sees blank screen, no idea what to do | Show "No wallet providers found. Make sure the SDK is initialized." message (reference implementation pattern) |
| Emoji products without clear pricing | User uncertain what they are paying for | Show product name, emoji, and USD price prominently in cart AND in checkout header |

## "Looks Done But Isn't" Checklist

- [ ] **SDK Initialization:** Often missing the `waitForClientInitialized` gate -- verify the provider shows loading until SDK is ready
- [ ] **Transaction Restore:** Often missing localStorage persistence of `transactionId` -- verify page refresh resumes checkout instead of resetting
- [ ] **Wallet Rejection Handling:** Often missing specific `rejected` error detection -- verify rejecting wallet popup cancels cleanly (not stuck spinner)
- [ ] **Terminal State Handling:** Often missing expired/cancelled/failed states -- verify all terminal states show appropriate UI with recovery action
- [ ] **Network Mismatch:** Often missing `getActiveNetworkData` call before `attachCheckoutTransactionSource` -- verify chainId is dynamic not hardcoded
- [ ] **Cancel Flow:** Often missing `cancelCheckoutTransaction` call on user cancel -- verify server-side transaction is cleaned up, not just UI reset
- [ ] **Two-Step Submit:** Often missing `onStepChange` UI feedback -- verify approval vs. transaction steps show distinct messages
- [ ] **Cart Freeze:** Often missing cart modification prevention during checkout -- verify cart cannot be changed after "Pay" is clicked

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double SDK initialization | LOW | Add the `initialized` boolean guard; single-file fix |
| Missing `waitForClientInitialized` | LOW | Wrap app in DynamicClientProvider with loading gate |
| Linear checkout assumption | MEDIUM | Refactor to state-machine with `deriveViewFromTransaction`; requires restructuring view logic |
| Quote staleness | LOW | Add timer/refresh to ReviewQuoteView; isolated change |
| Cart-checkout desync | MEDIUM | Introduce cart freeze mechanism and amount source-of-truth from transaction object |
| Missing approval step UX | LOW | Add `onStepChange` handler with step-specific messages |
| Infinite polling | LOW | Add timeout + terminal state check to status polling logic |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Double SDK initialization | Phase 1: Project scaffold + SDK setup | `initializeDynamicClient` has idempotency guard; Strict Mode double-render does not crash |
| Missing client initialization gate | Phase 1: DynamicClientProvider | Loading spinner appears before any checkout UI renders |
| Cart-checkout amount desync | Phase 2: Cart implementation | Cart is frozen/disabled once checkout begins; amount comes from transaction object |
| Non-linear checkout states | Phase 3: Checkout flow | `deriveViewFromTransaction` handles all execution/settlement states; page refresh restores correct view |
| Quote staleness | Phase 3: Review step | Quote shows estimated time; stale quote shows error with retry |
| Missing approval step feedback | Phase 3: Submit step | Two distinct messages appear for approval vs. transaction signing |
| Infinite status polling | Phase 3: Status step | Polling stops at timeout; manual check button appears; terminal states stop polling |
| Raw SDK error messages | Phase 4: Polish | All user-facing errors are mapped to readable messages |

## Sources

- Reference implementation: `/Users/etesenair/Projects/dynamic-sdk/apps/checkout-demo/` (HIGH confidence -- primary source)
- [7 UX Best Practices for Crypto Payment Checkouts](https://www.krayondigital.com/blog/7-ux-best-practices-for-crypto-payment-checkouts)
- [Crypto Checkout UX Design: Handling Payment Volatility](https://theenterpriseworld.com/crypto-checkout-ux-design/)
- [Why Your Swaps Fail (Uniswap)](https://blog.uniswap.org/why-swaps-fail-and-what-you-can-do)
- [Best UX Practices For a Crypto Payment Checkout Page](https://ccpayment.com/blog/best-ux-practices-for-a-crypto-payment-checkout-page/)
- [Dynamic Labs Documentation](https://www.dynamic.xyz/docs/react-native/client)

---
*Pitfalls research for: Crypto shopping demo with Dynamic SDK headless checkout*
*Researched: 2026-03-31*
