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

**Read the installed SDK, not the SDK checkout** (D-027): the local `dynamic-js-sdk` working copy is ahead of the published package, and its feature branches further still. At 1.29.0 the wrappers this app once reached around have caught up - `createBusinessAccount` takes `externalRef` and `metadata`, `listBusinessAccounts` takes `externalRefs` - so verify against `node_modules/@dynamic-labs-sdk/client/dist/**/*.d.ts` before writing a snippet or a call, and check the compiled bundle too when a field seems accepted: the two have disagreed here before (1.25.0 typed `name` only AND dropped the rest at runtime). `__tests__/sdk-surface.test.ts` pins whichever gaps are currently real, so a bump that closes one fails typecheck and names the follow-up.

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
- **One rule for the header's trailing slot: every control in it is `IconButton` from `packages/ui`.** Cog, sign-out and close are the same 32px circle in the same position, so no two can drift apart by a few pixels - which is what happened when the close used `WidgetCard`'s built-in `onClose` (a 24px circle) beside a 32px cog. The app therefore does NOT use `onClose`; a close renders through `trailing` like everything else, and the card gets `overflow-visible` so the tooltip is not clipped. A hand-rolled `<button>` in that slot is the bug, not the styling.
- **Nested settings screens carry a close, not just a Back.** `useNavigation` exposes `closeToRoot`, which returns to the thing the screen is ABOUT - the wallet's own screen for a wallet setting, the account's for an account setting - in one move. It is undefined at depth 1, where Back already does that, so `WidgetCard` hides the control; the depth tables (`WALLET_SETTING_DEPTH`, `ACCOUNT_SETTING_DEPTH`) are the single place that decides. A new settings screen gets the behaviour by adding a line there and passing `onClose={navigation.closeToRoot}`. Action screens (send, sign) are deliberately unlisted: they are the destination, not a detour.
- **Policies — rules the enclave enforces, and they belong to whoever they bind.** The cog in a wallet's header opens Wallet settings (Signers, Wallet rules); a signer's own rules open from that signer's row on the Signers screen, not from a screen that lists everyone. `hooks/use-policy-context.ts` derives layer target, chain, chain ids, assets and editability once for all four policy screens. Wallet rules bind every signer and only an owner/admin sets them; a signer's layer sits on top and can only tighten. Rules are chain-scoped, so each screen reads and writes the layer for the network the wallet is on. **A layer is navigated by rule TYPE, not as one form.** Wallet rules / Signer rules is a hub with a row per type - ADDRESSES (approve or deny a destination; one rule per address, with an optional per-transaction cap riding along) and TRANSACTION LIMITS (max per transaction; one rule per asset, each an addressless value limit) - each row carrying its count. Both types are lists because a rule holds one `addresses` set and one `valueLimit`, so "10 ETH and 500 USDC" is two rules; an asset picker on a single cap field just rewrote the same rule, which is the shape this replaced. A third type (total spend limits, `valueLimit.totalLimit`) is expected: it lands as another row on the hub, another screen, and another shape in `viewOfLayer` - nothing else moves. Note the SDK deliberately excludes `totalLimit` from its sugar today because the evaluator has no read site for it at the wallet/signer layer, so it is not merely a UI gap. Allow is the default because a layer that names nothing allows everything; naming an address to allow it is what narrows the wallet to it. A deny carries no amount - an address either may receive value or may not.
- **Policies need two environment flags, and say so when they are off.** The enclave answers `composition_disabled` - "Waas policy composition is not enabled for this environment" for the wallet layer, "Signer-managed defaults are not enabled" for the signer layer. Same shape of gate as `enable-business-accounts`: the calls are correct and the environment refuses them. The error renders on the form rather than being swallowed.
- **Policies are written one rule at a time, not through the SDK's sugar map.** `PolicyRules` carries a single allow-list with at most one `maxAmountPerTransaction` merged onto it, so a per-address cap ("0xA up to 100 USDC, 0xB up to 5") is not expressible through `createPolicy`. `lib/dynamic/policies.ts` uses `buildAllowPolicyRule` / `buildDenyPolicyRule` with `upsert{Account,Wallet,Signer}PolicyRule` instead - pass a `ruleId` to edit in place, omit it and the enclave mints one - and `remove{Account,Wallet,Signer}PolicyRule` to drop one. Reads go through `get{Account,Wallet,Signer}PolicyLayer` for the raw rules, because `getPolicy`'s sugar view collapses several address rules into one key and loses their ids. This also fixes a bug the sugar path had: saving the form used to `removePolicyRules(["blockExport", ...])` for every key the form did not carry, silently deleting a key-export block nobody asked it to touch. Rules outside the two shapes the screens model are counted (`otherRuleCount`) and left alone.
- **Two chain enums, one rename.** A wallet's chain comes from `ChainEnum` (`SOL`); a policy rule is scoped by `WaasChainEnum` (`SVM`). Every other chain this demo mints is spelled the same in both, so `toPolicyChain` in `policies.ts` maps only `SOL`/`ECLIPSE` → `SVM` - applied on the way in (both rule builders and the batch fallback) AND on the way out (the chain filter in `viewOfLayer`), or a Solana wallet writes rules it can never read back. Passing the wallet's own spelling through is what produced `request/body/rule/chain must be equal to one of the allowed values`.
- **The single-rule endpoint and the batch endpoint disagree about a layer.** `upsert{Wallet,Signer,Account}PolicyRule` sends `op: "upsert"` and can answer `wallet_policy_layer_not_found` on a layer that `createPolicy`'s `op: "batch"` writes to happily - the same PATCH URL, different op. So every write tries the rule-level call first and falls back to `writeAsBatch` (a `createPolicy` with the equivalent sugar) when that specific code comes back. The batch call is second, not first, because its sugar map holds one allow-list and one cap: enough to seed a layer, not enough for per-address or per-asset rules. Note `createPolicy` READS the layer before writing, so the fallback still fails on a layer that genuinely does not exist - which is what the missing-layer notice covers.
- **A layer that has never been written 404s, and that is not an error.** A wallet with no rules yet has no layer, and `get*PolicyLayer` answers `wallet_policy_layer_not_found` / `signer_policy_layer_not_found`. `readLayer` recognizes those by code suffix and substitutes an empty layer, because the generic 404 handling reads "not a member of this account" - which is what every new wallet's rules screen showed until this was caught. Matched on the code, not the status, so a real non-member 404 still surfaces.
- **The raw rule helpers are addressed by wallet ACCOUNT, not wallet id.** `getWalletPolicyLayer` / `upsertWalletPolicyRule` / `upsertSignerPolicyRule` all take a `WalletAccount`, so a member who administers a wallet but holds no share for it cannot read its layer through them - the screen says so rather than showing an empty one. (`getPolicy`'s scope form does take a bare `walletId`, but only returns the lossy sugar view.)
- **`WaasPolicyRuleType` and `isPolicyRuleDeletionMarker` are not re-exported from the SDK's `waas` entrypoint.** `policies.ts` compares `String(rule.ruleType)` against `"deny"` and recognizes a deletion marker structurally (`"deletedById" in rule`). Both would be a one-line simplification if the SDK exports them.
- **A cap binds exactly one asset.** `valueLimit.asset` names the token; omitting it caps the chain's NATIVE coin - and a native cap does not bound a token transfer at all, because an ERC-20 transfer moves zero native value. So "10 ETH" and "10 USDC" are two separate rules, and the cap field says which asset it limits rather than leaving the reader to infer it from a payload with no `asset` field. A cap is stored in the asset's smallest unit. The UI takes the amount in display units and converts with `viem`'s `parseUnits` / `formatUnits` (`lib/amounts.ts`) - never `Number`, where 1 ETH in wei has already lost precision. `lib/cap-assets.ts` holds the native coin (read off `networkData.nativeCurrency`) plus verified USDC/USDT addresses per chain id; anything else is entered as a contract address, where decimals aren't discoverable from the rule and default to 18.
- The scoped api-core override this app carried is gone; 1.29.0 pins its own.
- **1.29.0 narrowed `businessAccountId` off `BaseWalletAccount` onto `WaasWalletAccount`**, so `signableWalletsFor` reads it through a cast rather than off the union. Use `isWaasWalletAccount` if that filter ever needs to be more than a comparison.
- **Quorum still does not exist.** No `requireApprovals`, `approveProposal`, `executeProposal` or `governance` in api-core 0.16.0; the docs page still says "coming soon, shape may change".
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

- `/api/hidden-accounts` (`GET`, `PUT`) — the only server route. Every other operation is a client-side SDK call; this one exists because the write needs the admin token, which must never reach the browser (see the invariant below).

The app is otherwise entirely client-side. This app is one of the **non-consumers** of `@dynamic-demos/dynamic`'s demo-middleware / sync-cookie / `<DynamicInit />` primitives — it consumes the SDK as a client-side singleton without JWT cookie sync, like wallet. See `packages/dynamic/AGENTS.md` "Open questions".

## Required environment

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` — per-app Dynamic env — optional, falls back to the workspace default via `resolveCredentials()`. **Must be an environment with `enable-business-accounts` on, and with at least one step-up-capable credential (email OTP, TOTP, or passkey) enabled** — signer and member mutations are unreachable otherwise.
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID_DEFAULT` — workspace default.
- `NEXT_PUBLIC_DASHBOARD_API_URL` — dashboard API base, for per-prospect theme configs.
- `NEXT_PUBLIC_TRACK_URL` — GTM ingest base URL (`@dynamic-demos/analytics`) — optional. Unset → `<GtmTracker>` / `useTrack()` are total no-ops; the app builds and runs unchanged.

SDK versions are direct-pinned to `1.29.0` (exact), not the workspace catalog's `0.25.0`: the business-accounts surface does not exist below 1.20. Bumping this app is independent of the catalog.

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
| `policy_updated` | A rule on a layer is written or removed. | `{ layer, rule }` - which layer, and which kind of change (`allow`, `allow_capped`, `deny`, `native_limit`, `token_limit`, `removed`); never an address, a token or an amount |
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
- The account layer has no UI. `lib/dynamic/policies.ts` handles `{ kind: "account" }` and the SDK ships the helpers, but an account spans wallets on several chains while a rule is chain-scoped, so which network an account-wide rule targets is an open product question.
- Server signers (`signerType: "server"`) are rendered (a `server` pill) but not creatable here — that is a backend-held API key identity, not a browser flow. A follow-up could add it via a dashboard endpoint.
- No smoke test drives the widget end-to-end; the suites cover the pure layers (identity mapping, authorization derivation, error translation, panel content). A real-environment E2E needs a Dynamic env with the early-access flag on (D-023).
