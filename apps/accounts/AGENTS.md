---
name: "@dynamic-demos/accounts"
kind: app
flow_role: wallet
custody: non-custodial
status: experimental
provider:
  name: Dynamic Business Accounts (early access)
  docs: https://www.dynamic.xyz/docs/api-reference/sdk/sdk-%E2%80%94-create-a-business-account
  api_reference: https://www.dynamic.xyz/docs/api-reference/sdk/sdk-%E2%80%94-get-a-business-account-with-embedded-members-and-signers
  agent_docs: none
---

# @dynamic-demos/accounts

Business Accounts demo. A business account owns embedded MPC wallets on behalf of a team and splits two kinds of reach: **members** administer (owner / admin / viewer), **signers** hold a key share for one wallet and can sign with it. An admin cannot sign; a signer gets no admin rights. Used to demo company treasuries, B2B platforms provisioning customer wallets, supervised consumer accounts, and agent-assisted wallets.

## Provider documentation

Business Accounts is **early access**, gated by the `enable-business-accounts` flag on the Dynamic environment. Without the flag every call returns 403. The JavaScript reference pages are not published yet; the live docs are the SDK API reference pages linked in `lib/code-steps.ts` (`DOCS`), which document exact request and response shapes.

**Read the installed SDK, not the SDK checkout** (D-027, with a caveat this app learned): the local `dynamic-js-sdk` working copy is ahead of the published package. At the pinned 1.25.0, `createBusinessAccount` accepts `name` only and `listBusinessAccounts` takes no params — both of which take more in the SDK source. Verify against `node_modules/@dynamic-labs-sdk/client/dist/**/*.d.ts` before writing a snippet or a call, and check the compiled bundle too when a field seems accepted: the wrapper's runtime sends `{ name: params?.name }`, so a passed `externalRef` is **dropped, not rejected**. Where a convenience wrapper is too narrow, `createApiClient` (`@dynamic-labs-sdk/client/core`) reaches the generated request type with the SDK's own transport - that is how create sets `externalRef` and `metadata`.

## Capabilities

- Login (Dynamic, email OTP + social providers configured per environment).
- Accounts — list (scoped to the user's memberships), create (with `externalRef` + a website logo stored on `metadata`), read in full, edit the name. No search box: the list is already scoped to the caller's memberships, so filtering it solved a problem at a scale this widget does not reach.
- Wallets — mint a wallet the account owns outright (`createWalletForBusinessAccount`) from the Add Wallet chain list, plus detach. **Bringing an existing personal wallet under an account is out of scope for this demo**: `addWalletToBusinessAccount` stays wrapped in `lib/dynamic/business-accounts.ts` for completeness, but it is neither surfaced in the widget nor taught in the code panel. Do not add it back to either.
- Using a wallet — tapping one in the list opens its transactions directly (no intermediate detail screen, matching `apps/wallet`), with a network switcher, copy, refresh, and Send. Sending goes through `transferAmount`, which is chain-agnostic: one call covers EVM, Solana, Bitcoin, Sui and TON, so this app carries no viem / web3.js / Sui client. Balances come from `getNativeBalance` (chain RPC) and `getTokenBalances` (Dynamic's indexed API, `includeNative` folding the two into one asset picker). **None of these are business-account calls** — a wallet the account owns and the user holds a share for is just a `WalletAccount`, and that is the point the `transactions` panel section teaches. Sign Message is beside Send for the same reason and is the better smoke test: a failed transfer can be blamed on an empty balance, a failed signature cannot.
- **Two sponsorship mechanisms, both Dynamic-native.** EVM: `isEvmGasSponsorshipEnabled` / `sendSponsoredTransaction` (`lib/dynamic/gasless.ts`). Solana: `isSolanaGasSponsorshipEnabled` / `signAndSendSponsoredTransaction` (`lib/dynamic/gasless-solana.ts`), which replaces the fee payer server-side rather than delegating - so the transaction must be BUILT locally and cannot go through `transferAmount`, which is why `@solana/web3.js` and `@solana/spl-token` are dependencies (pinned to the exact versions `@dynamic-labs-sdk/solana` bundles - a different minor makes the built transaction a nominally distinct type at the SDK boundary and fails to compile). **Both `canSponsor*` helpers swallow a throw**: the SDK's settings accessors `assertDefined(projectSettings)` and these run during render, so an unguarded call takes the send screen down on a paint that beats hydration. Unknown means unsponsored.
- **The sponsored EVM send reports real progress.** It composes `signSponsoredTransaction` -> `relaySponsoredTransaction` -> `waitForSponsoredTransaction` rather than the one-shot `sendSponsoredTransaction`, purely so the button can name the step it is on (`SendStage` in `lib/dynamic/gasless.ts`). Each label is reported only once the step it names has completed - never a timer pretending. One spinner, in the button, wearing the stage as its label - rendered by hand rather than via `Button`'s `loading`, which swaps the children out for a bare spinner and would hide the very thing worth saying; the unsponsored path reports no stages and sits on "Signing", which is true of it.
- **EVM sponsorship is EIP-7702**, not ZeroDev: `@dynamic-labs-sdk/evm` ships `isEvmGasSponsorshipEnabled` / `sendSponsoredTransaction` at the pinned version, so there is no second SDK and no kernel client (`lib/dynamic/gasless.ts`). EVM only — the caller checks `canSponsorTransfer` and falls back to `transferAmount`. This is why `viem` is a direct dependency: the sponsored path takes raw calls, so a token send needs `encodeFunctionData`. Never propose ERC-4337 or a smart-account-per-user here.
- **`evmGasSponsorshipEnabled` and the ZeroDev provider config are different switches on the same environment.** As of 2026-08-06 env `a5c204fe-…-8da2fb570ec1` has the native EVM flag OFF, `svmGasSponsorshipEnabled` ON, and ZeroDev configured for 84532 + 11155111. `apps/wallet`'s "Gas Sponsored" badge reads the ZeroDev list (`isNetworkSponsored`), which is why wallet shows sponsorship on Base Sepolia while this app does not - same environment, different mechanism. Verify with `curl https://app.dynamicauth.com/api/v0/sdk/<envId>/settings` before assuming either is on.
- Signers — add a co-signer via the MPC reshare ceremony, and revoke one. They live behind the Signers icon on a wallet's transactions screen, not on the way in: managing them is administration, and a wallet is opened to use it. Both gated on step-up. Add Signer lists the account's members first (filtered to those who cannot already sign for *that* wallet, since signer rows are per wallet) and adds a chosen one by bare `targetIdentity.userId`, no identifier typed; an email field below covers someone who is not a member yet.
- **Both "add" forms are email-only.** The SDK takes six identifier types and `lib/business-accounts/identity.ts` still maps all of them (the code panel teaches the full surface), but an address is the only identifier the app can read back afterwards — see the member-emails note — so it is the only one the UI offers. There is no identifier-type picker in either screen.
- Members — add with a role, move between admin and viewer, transfer ownership, remove.
- **The UI never editorialises about missing API surface.** It is a demo: copy explaining what the SDK lacks belongs in code comments and here, not on screen. That covers the widget AND the code panel - no "the wrapper only forwards X today", no feature-flag names, no "there is no delete". Early access is stated as early access. The Edit screen's Hide is a plain button with no caption.
- **Wallet row actions are inline, not in a menu** (the shared `Menu` exists in `packages/ui` but this app does not use it): copy sits beside the address, Detach sits right of "Add signer" and is tinted red **at rest** — `Button`'s `danger` prop only colours on hover, so it needs explicit classes. (Detach is gated off right now, see the invariant below; the layout is what it renders when re-enabled.) Arming a destructive action replaces the whole action cluster and hides status chips, so nothing unrelated is offered mid-decision. `ConfirmPair` puts the destructive verb first, Cancel second.
- **No delete, so hiding stands in.** The generated `SDKApi` exposes 42 business-account methods and none removes an account - no delete, archive, or deactivate - so one you create is permanent. Hidden ids live on the user's **Dynamic user metadata** (key, cap and tolerant parser in `@dynamic-demos/dynamic`), not `localStorage` - which was the first implementation and meant clearing the cache un-hid everything, exposing the choice as a property of the browser rather than the person. The write needs the admin token, which can edit ANY user in the environment, so it stays server-side: `app/api/hidden-accounts` verifies the caller's own JWT and acts only on the id that token names. A body-supplied user id would turn a hide button into "edit anyone's metadata". Hiding is presentation only and never an authorization input - a hidden account is still fully reachable by id.
- Step-up authentication — `components/step-up/step-up-provider.tsx` is the one place a credential is collected. `withStepUp(scope, fn)` checks, prompts (email OTP / TOTP / passkey), then runs `fn`; the SDK attaches the scoped elevated token itself. The BA session scopes are bundled into the first elevation so one prompt covers the session; `BusinessAccounttransferOwnership` is excluded because the server issues a single-use token for it.
- Screen transitions are wallet's, deliberately identical: `transitionTo` in `hooks/use-navigation.ts` sets `isTransitioning`, waits `TRANSITION_DURATION` (150ms), then swaps; `components/accounts-app.tsx` dims the wrapper to `opacity-50` for that window. No per-screen keyframes and no keyed element - an earlier direction-aware slide was rejected because moving the card mid-swap read as a flash. Keep the two apps in step rather than reinventing this.
- **Screen order follows use, not hierarchy.** Tapping an account opens its **wallets**; tapping a wallet opens its **transactions**. The administrative screens hang off gear/icon affordances in those headers (account settings from wallets, signers from a wallet's transactions) rather than sitting on the way in. Two hub screens used to stand between a signed-in user and the thing they came for. `AccountScreen` is now that settings hub and deliberately has NO Wallets row - it sits behind the wallets, not above them.
- Context-aware panel — widget screens drive the scenario page's code panel via `contexts/panel-section-context.tsx` + `components/accounts-panel.tsx`; all variants are pre-highlighted server-side in `app/page.tsx`. **One section per screen, not per topic**: the panel is read beside a screen, so a step for a call that screen does not make is noise. `accounts` (create / read one in full), `rename`, `wallets` (list the account's wallets + the signable match behind the `signer` pill), `add-wallet` (mint), `transactions` (history + network chip), `send` (transfer, sponsorship, balances, network chip), `signing` (sign a message), `signers` (step-up, reshare, revoke), `members` (roles and ownership). Adding a screen means adding its section, not appending a step to a neighbour's. Detach has no section because `WALLET_DETACH_ENABLED` is false - no control, no step. Screens declare their section via `usePanelSectionEffect` — top-level screens only; a component nested inside a screen must not call it, or its unmount resets the panel under the still-mounted parent.
- Scenario front door — `/` is a flow-style scenario page inside the shared Dynamic site chrome: the live widget beside an SDK-only integration panel (`buildScenarioChrome` / `ScenarioHero` / `ScenarioLayout` / `CodePanel`). Snippets are Shiki-highlighted server-side from app-owned content (`lib/code-steps.ts`). No auth gate — the login card is live on the page.

## Public surface

App routes:

- `/` — scenario page: Dynamic site chrome + live widget + SDK code panel.

No `/api/*` routes: every operation is a client-side SDK call, so there is no server-side state to expose. This app is one of the **non-consumers** of `@dynamic-demos/dynamic`'s demo-middleware / sync-cookie / `<DynamicInit />` primitives — it consumes the SDK as a client-side singleton without JWT cookie sync, like wallet. See `packages/dynamic/AGENTS.md` "Open questions".

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional, falls back to the workspace default via `resolveCredentials()`. **Must be an environment with `enable-business-accounts` on, and with at least one step-up-capable credential (email OTP, TOTP, or passkey) enabled** — signer and member mutations are unreachable otherwise.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_DASHBOARD_API_URL` — dashboard API base, for per-prospect theme configs.
- `NEXT_PUBLIC_TRACK_URL` — GTM ingest base URL (`@dynamic-demos/analytics`) — optional. Unset → `<GtmTracker>` / `useTrack()` are total no-ops; the app builds and runs unchanged.

SDK versions are direct-pinned to `1.25.0` (exact), not the workspace catalog's `0.25.0`: the business-accounts surface does not exist below 1.20. Bumping this app is independent of the catalog.

## Analytics taxonomy

`<GtmTracker demoSlug="accounts">` wraps the tree in `app/layout.tsx`; no-op with `NEXT_PUBLIC_TRACK_URL` unset. The floating `<BookACallCta>` is deliberately NOT mounted — Book a call already lives in the header and hero. Pageviews and heartbeats are package-owned. `AccountsMilestone` (`lib/analytics/milestones.ts`) is the single-source string-literal union behind every `milestone()` call; `useMilestone()` / `useMilestoneOnce()` narrow `useTrack().milestone`'s plain `string` to it, so a typo is a type error. Renaming any of these is a breaking analytics change.

**No prop ever carries a wallet address, email, user id, or account id** — identity stays share-link-only. Props are shape.

| Milestone | Trigger | Props |
|---|---|---|
| `signed_in` | Dynamic auth success (`isLoggedIn` flips true), session-deduped via `useMilestoneOnce`. | none |
| `authenticated` | Any auth method succeeds and the Dynamic user populates (`<IdentityBridge />`, mounted once in `app/layout.tsx` inside `<GtmTracker>`, feeding the shared `useIdentify`). Gated on `isClientReady` so the fully-restored user (with email) is read first. Fires once per page load, deliberately not `sessionStorage`-deduped — a reload of an already-signed-in session must still re-send identity. | `{ dynamicUserId, email? }` — resolved by the shared `resolveUserEmail`, identical across demos. |
| `account_created` | Create resolves. | `{ named, hasExternalRef, hasLogo }` — booleans only, never the values. |
| `account_wallet_created` | `createWalletForBusinessAccount` resolves. Per-action, not deduped: a second wallet is a second event. | `{ chain }` |
| `signer_added` | `addBusinessAccountSigner` resolves — the reshare completed. This is the milestone that means the demo landed. | `{ chain, identifiedBy }` — `identifiedBy` is the identifier *type* (`email`, `userId`, …), never the identifier. |
| `member_added` | `addBusinessAccountMember` resolves. | `{ role, identifiedBy }` |
| `wallet_transfer_sent` | The transfer resolves with a hash, sponsored or not. Per-action. | `{ chain, asset, sponsored }` — `asset` is `native` or `token`, never a contract address or an amount. |
| `wallet_message_signed` | `signMessage` resolves. Per-action. | `{ chain }` — never the message or the signature. |

Nothing fires when step-up is declined or a mutation throws: `onSuccess` is the only emitter.

## Theming

Consumes `@dynamic-demos/theme/defaults.css` (D-007 / D-020) and rides the canonical Dynamic-default values (D-030 flow palette) with **no local value overrides**; `app/globals.css` keeps only the `--widget-*` compat aliases (which track `--brand-*`). Middleware forwards `?theme=<configId>` as `x-accounts-config-id` and `?scope=<page|widget>` as `x-accounts-theme-scope` (both sticky-cookied; an empty param clears on the same request); the layout fetches the config and injects overrides via `<ThemeStyleTag overridesOnly>` (D-008) plus `AccountsConfigProvider`. **Brand scope:** `page` (default) attaches overrides to `:root` — full immersion; `?scope=widget` confines them to `.brand-scope` (the widget column) so only the live widget restyles while hero, panel, and site chrome keep the canonical Dynamic look. The brand logo follows the scope (`ScenarioBrandLogo`). The `--widget-*` aliases are declared on `:root, .brand-scope` — the re-declaration is required because custom properties capture `var()` where they are defined. Clear-theme rides the shared `SiteFooter` links row via `buildScenarioChrome`.

## Credentials

- **Dynamic:** per-app or workspace-default (D-003).
- **Fireblocks:** none.
- **Other providers:** none.

## Slots vs invariants

**Slots:** brand, enabled auth methods (Dynamic env decides), `WALLET_CHAINS` in `lib/chains.ts`.

**Invariants:**

- Non-custodial — key shares live with Dynamic and the signers; no app-side custody.
- `WALLET_CHAINS` must stay a subset of the extensions registered in `lib/dynamic/client.ts`. `createWalletForBusinessAccount` resolves the WaaS provider by chain, so a listed chain without its extension throws at call time.
- Authorization questions are answered from the server's view (`detail.members` / `detail.signers`) via `lib/business-accounts/view.ts`, never from local session state — so a wallet the user can sign for but which is absent from `getWalletAccounts()` still offers "Add signer".
- Backend guards are mirrored in the UI rather than surfaced as errors: no revoke on a wallet's last signer, no detach of an account's last wallet, no remove on the owner row. **Role gates track what the role picker promises**, not a guess: detach is owner-or-admin (`canManageWallets`) because the picker says an admin manages "wallet links". Gating it on owner alone made the action vanish for anyone who had transferred ownership away, contradicting our own copy. Unverified server-side - a refusal surfaces in the confirm step.
- Members and signers are invited by email only, even though the SDK takes six identifier types. The reason is `lib/business-accounts/member-emails.ts`: the roster the server returns carries no identifier, so an address typed here is the only thing that lets a member row show a person instead of a uuid. It is remembered in `localStorage`, per account, keyed by the `userId` the invite resolved to — device-local because these are other people's addresses, and a display concern only, never an authorization input. A member added from another browser still renders as an id; the real fix is the API returning member identity.
- **Any RBAC-changing operation can end the caller's session server-side**, not just transfer: detaching a wallet does it too (observed 2026-08-06 - the detach SUCCEEDED, the session died, and the widget reported the resulting 401 as if the operation had failed). So an `unauthorized` error after a mutation must NOT be presented as a failure; `get-error-message.ts` says the change may already have gone through. Re-reading to confirm is impossible - the token is dead. Transferring ownership ends the caller's session server-side (their claims change, so the backend revokes the token — the SDK's own `/revoke` then 401s). Unavoidable from the client, so the screen states it up front and arms the action like a destructive one. Signing back in recovers cleanly.
- **Detach is switched off** behind `WALLET_DETACH_ENABLED` in `lib/business-accounts/view.ts` (2026-08-06). Network capture: step-up returns `isRequired: false` so no prompt is involved, the detach itself returns 2xx, and the token `refresh` immediately after it fails - the wallet is gone but the widget is holding a dead session and cannot read that back. The mutation hook, the guard functions and the code-panel step all stay; only the affordance is gated, so re-enabling is one line. Filed against Dynamic; flip it when a detach leaves the session intact.
- Irreversible actions (remove member, detach wallet, revoke signer, transfer ownership) arm before they commit, via `useConfirm` + `ConfirmPair`. Inline in the row, not a dialog - the widget's controls stay inside the card. Arming lapses after 6s, and one row is armed at a time. Anything new that destroys server state joins this pattern.
- The role picker is the shared `SelectMenu`, not `Select` — a native `<select>` draws its option list with the OS palette, which ignores the brand tokens. Its value is narrowed through `assignableRole`, so `owner` can never be an option (ownership moves by transfer).
- Every screen ends the same way: the primary action as a full-width `Button`, then one `text-[11px]` line on what the server will refuse. Keep new screens on that shape.
- Apps don't access Postgres (D-002). Account state lives in Dynamic.
- Branded demo URLs (`?share=` and/or `?theme=`) get `X-Robots-Tag: noindex, nofollow` via the shared `createConfigForwardingMiddleware`; the bare URL stays indexable.
- `app/opengraph-image.tsx` renders the unfurl via the shared `renderDemoOgImage` — generic "Accounts" preview, identical for branded and bare URLs, so a forwarded link never leaks which prospect it is for.

## Data boundaries

- No Postgres, no Redis.
- Account, member, signer, and wallet state → Dynamic (server-side, read through the SDK).
- No canonical transactions — this app moves no money.

## Deployment

- **Vercel project:** `dynamic-demos-accounts` (to be created).
- **Root dir:** `apps/accounts`.
- **Required env:** see above.
- **Owner:** demos team.
- **Dev port:** 4014.

## Integration map

**Imports:** `@dynamic-demos/dynamic`, `@dynamic-demos/ui`, `@dynamic-demos/utils`, `@dynamic-demos/theme`, `@dynamic-demos/types`, `@dynamic-demos/analytics`, `@dynamic-demos/code-highlight`.
**Imported by:** none.

## Examples

```ts
// Every gated mutation follows this shape (hooks/use-business-accounts.ts).
const { withStepUp } = useStepUp();

await withStepUp(TokenScope.BusinessAccountsigneradd, () =>
  addBusinessAccountSigner({
    businessAccountId,
    targetIdentity: { identifier: "cfo@acme.example", identifierType: "email" },
    wallet: { address: wallet.publicKey, chain: wallet.chain },
  }),
);
```

## Do / Don't

- Do: route every elevated-token-gated call through `withStepUp` — never call the SDK mutation directly and let the 403 surface.
- Do: verify SDK signatures against the installed `.d.ts` before adding a call or a snippet (see "Provider documentation").
- Do: keep panel snippets on the documented `@dynamic-labs-sdk/client/waas` surface, not this app's wrappers — test-enforced in `__tests__/code-steps.test.ts`.
- Don't: pass `WalletAccount.id` where a `walletId` is wanted. The link and reshare endpoints key on the verified-credential id; `WalletAccount.id` is a composite `walletProviderKey:address`.
- Don't: add a member expecting them to sign, or a signer expecting them to administer. The two are independent by design.
- Don't: persist account state outside Dynamic.

## Gotchas

- **Wallet ownership goes stale.** Minting or linking a wallet moves ownership server-side (a linked wallet's `businessAccountId` is set and its `userId` cleared), so the session's cached user drifts. The SDK calls `refreshAuth` inside `addWalletToBusinessAccount` and `createWalletForBusinessAccount`, which is enough. **Do not add an eager `refreshAuth` on mount** — it rotates the token (full verify, old JWT invalidated), so two racing calls (StrictMode runs effects twice in dev) leave the client holding a rotated-out token: `POST /refresh 401`, then every later call 401s. This app used to do it and it wedged the widget in the signed-in UI with nothing working. If a call needs a fresh token, refresh at that call site. Mutations that move ownership additionally invalidate the react-hooks wallet cache, whose key is namespaced (`["@dynamic-labs-sdk/react-hooks", "state", "useGetWalletAccounts"]`) and therefore matched by segment, not by exact key.
- **`addBusinessAccountSigner` takes a `WalletAccount`, but only reads two fields.** The reshare resolves the WaaS provider by `chain` and reshares by `address`. `lib/dynamic/business-accounts.ts` constructs the minimal `{ address, chain }` and confines the cast to that one function — which is what lets a signer be added to any business-account wallet the user signs for, not just the ones in this session's `getWalletAccounts()`.
- **`WALLET_CHAINS` is a ceiling, not a promise.** `EVM`, `SOL`, `BTC`, `SUI`, `TON` — each needs its extension registered in `lib/dynamic/client.ts` (`addTonExtension` is params-first: `addTonExtension({}, client)`). The picker shows this set **intersected** with the environment's enabled networks via the shared `deriveChainOptions`, so a listed chain the environment has not enabled simply does not appear.
- **`identifierType` has no `userId` member.** The SDK's union is `email | phoneNumber | externalUserId | socialUsername | socialAccountId | id`; naming a known Dynamic user goes through `targetIdentity.userId` instead. `lib/business-accounts/identity.ts` models the app-level `userId` mode as its own branch for exactly this reason.
- **Step-up prompt settling uses a ref, not state.** A state updater can run twice under StrictMode, which would resolve or reject the same promise twice.
- **Wallet creation fails server-side and presents as a stall.** Confirmed in Dynamic's Datadog (2026-08-06, `x-dyn-request-id: a95fa816-576b-42f8-982b-863a29d4444a`): keygen completes and the SSE `keygen_complete` is delivered, then ~25s in the MPC enclave drops the HTTP connection mid-response (`[WaasEnclaveConnectionClosed]` in `redcoast-api`), which surfaces to the client as `Internal server error` and `[DynamicWaasWalletClient]: Error creating wallet account`. Not app code, and not SSE availability - the client just never receives a completion. `useCreateAccountWallet` races a 90s timeout and re-reads the account either way, so it errors instead of spinning forever and a wallet minted anyway still appears.
- **Member and signer rows show the signed-in user's email only.** `BusinessAccountMember` carries `userId` and no email; resolving another user's would need the server-side admin API, which this app has no credentials for.

## Open questions / known gaps

- Panel steps for Business Accounts carry **no docs link** - those pages are unpublished. Only the general, published pages (client setup, react-hooks, email sign-in, step-up) link out; `__tests__/code-steps.test.ts` enforces that no step links an `api-reference` page.
- `externalRef` and `metadata` cannot be set through the `createBusinessAccount` wrapper. `__tests__/sdk-surface.test.ts` pins this with `@ts-expect-error`, so a version bump that adds the field fails typecheck and names the follow-up rather than leaving it to this note. Not merely a type gap - the compiled 1.25.0 implementation sends `createBusinessAccountSdkRequest: { name: params?.name }`, so a passed `externalRef` is dropped at runtime. The REST endpoint does accept it. The create form therefore does not ask, and the account list falls back to showing the account id rather than "no external ref", which read as a missing feature. Add the field to `create-account-screen.tsx` and the panel snippet once the published SDK forwards it.
- Server signers (`signerType: "server"`) are rendered (a `server` pill) but not creatable here — that is a backend-held API key identity, not a browser flow. A follow-up could add it via a dashboard endpoint.
- No smoke test drives the widget end-to-end; the suites cover the pure layers (identity mapping, authorization derivation, error translation, panel content). A real-environment E2E needs a Dynamic env with the early-access flag on (D-023).
