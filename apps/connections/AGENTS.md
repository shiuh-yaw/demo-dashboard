---
name: "@dynamic-demos/connections"
kind: app
flow_role: auth
custody: non-custodial
status: experimental
---

# @dynamic-demos/connections

Connect-only wallet flow: the user picks a wallet, we read its **public address**, and we redirect back to a caller-supplied URL with the result. Nothing is ever signed - no message, no transaction, no custody. It exists to be embedded: an integrator drops it in an iframe or a native webview and treats it as a hosted "log in with your wallet" screen over 600+ EVM and Solana wallets.

Ported from [dynamic-labs-oss/iframe-fb](https://github.com/dynamic-labs-oss/iframe-fb) (Vite SPA → Next App Router). The vendored upstream is the first commit on the porting branch, so the port is reviewable as a diff against it.

## Capabilities

- **Wallet picker** - 4 featured wallets (`FEATURED_WALLETS` in `lib/config.ts`) plus search over Dynamic's full catalogue (`useGetWalletOptionsCatalogue({ includeMobileOptions: true })`), each with its real icon. Not-installed wallets get an install link for the current platform.
- **Connect paths** - injected/extension wallets via `useConnectWithWalletProvider`; non-installed wallets via a minted pairing URI (WalletConnect, or MetaMask's own SDK URI) rendered as a QR on desktop and a deeplink on mobile; Base Account as an SDK connector; Phantom mobile via its encrypted redirect protocol.
- **Chain picker** - shown only when the selected wallet is installed on more than one chain (EVM and Solana).
- **Manual address entry** - detects EVM vs Solana live as you type; rejects Tron explicitly (its Base58 range overlaps Solana's).
- **Redirect hand-off** - explicitly confirmed, never automatic. The connected screen shows wallet / chain / address and waits for **Continue**, so the user can verify which account came back (a wallet may hold several) and swap wallets first. See the contract below.
- **Headless engine** (`/headless`) - the same connect logic with no UI, driven by a native host over a JS bridge so native can render its own wallet list. Verifiable in a browser at `/headless-test`.
- **Integration guide** - the scenario page's right column, tabbed Web / iOS / Android with a Basic / Headless toggle inside the native tabs. Quotes the harnesses in `native/` verbatim (`components/docs-sections.tsx`).

## Routes

| Route | Chrome | Purpose |
|---|---|---|
| `/` | Shared scenario chrome (`SiteHeader`, `ScenarioHero`, `CodePanel`, `SiteFooter`) | Front door: live widget beside the SDK integration panel. |
| `/connect` | **None - chromeless, full-bleed** | The embed target. What an integrator points an iframe or webview at. |
| `/headless` | None (renders nothing) | Headless bridge engine for native hosts. |
| `/headless-test` | Minimal | Desktop stand-in for the native host; embeds `/headless` in a hidden iframe. |
| `/callback` | Own card | Default redirect target: renders the params we handed back. Stands in for an integrator's endpoint. |

**Invariant:** `/connect` and `/headless` must stay free of site chrome, floating CTAs, and auth gates. They render inside someone else's page or app, where a redirect to a login screen has nowhere to go and a Book-a-call button is someone else's UI. New global chrome belongs in `app/page.tsx`, not `app/layout.tsx`.

## Redirect contract

**Incoming query params** (read on load):

| Param | Meaning |
|---|---|
| `redirect_uri` (alias `redirect_url`) | Where to send the user after connecting. Falls back to `NEXT_PUBLIC_CONNECT_REDIRECT_BASE_URL`, then to the same-origin `/callback` page. |
| `nonce` | Opaque value echoed back unchanged; if absent, none is returned. |
| `wallet` | Skip the picker and go straight into that wallet's flow. |
| `chain` | `evm` \| `solana` - preselect a chain. |
| `embedded` / `platform=webview` | Authoritative "I am in a webview" signal; beats UA sniffing. |
| `returnScheme` | Host app's custom scheme, used **only** to build Phantom's redirect target. |
| `debug` | Renders the on-screen environment readout (`components/debug-panel.tsx`). |

**Outgoing:** `address`, `chain` (`evm` \| `solana`), `walletName`, `walletImage`, and `nonce` (only if one came in).

## Security

- **`redirect_uri` is an open-redirect surface.** It is caller-supplied and flows into `window.location.assign`. Default (permissive) mode accepts `http(s)` plus any hierarchical custom app scheme not on `BLOCKED_REDIRECT_SCHEMES` (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `about:`). Script/data vectors are rejected structurally - they carry no host - rather than relying on block-list completeness.
- Set `NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES` for a strict scheme allow-list. **Any deployment reachable by untrusted callers should set it and should additionally allow-list permitted `http(s)` hosts** - host allow-listing is not implemented yet. This is inherited upstream behaviour, deliberately preserved on the port for parity; tightening it is a follow-up.
- `returnScheme` is validated against `/^[a-z][a-z0-9.+-]{1,32}$/` and the block-list before it is used to build a URL.
- Connect-only is a security property, not just a UX one: the flow never calls a signing API, so a compromised or hostile caller cannot get a signature out of it.

## Environment

See `.env.example`. All sandbox by default (D-005); nothing here is a secret.

- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - optional; falls back to the workspace default via `resolveCredentials()` (D-003).
- `NEXT_PUBLIC_CONNECT_REDIRECT_BASE_URL` - default callback. Unset means the same-origin `/callback` page, which shows the returned params; an external default hid the flow's only output.
- `NEXT_PUBLIC_CONNECT_ALLOWED_REDIRECT_SCHEMES` - strict scheme allow-list. See Security.
- `NEXT_PUBLIC_TRACK_URL` - GTM ingest. No-op when unset.
- `DASHBOARD_API_URL` - dashboard base for branding/theme configs.

Dynamic dashboard setup: enable **EVM** and **Solana**, add the app origin to **Allowed Origins**, and add a WalletConnect project ID (otherwise non-installed wallets can't pair).

## Slots vs invariants

**Slots:**

- `FEATURED_WALLETS` - which wallets surface before search.
- `FEATURED_LIST_SIZE` (`lib/config.ts`) - how many rows show before the user searches. Caps detected extensions + `FEATURED_WALLETS` together, since both feed the list.
- Brand theme via `?theme=<configId>` (sticky `connections_config_id` cookie → `x-connections-config-id` header).
- The default redirect target and scheme policy.

**Invariants:**

- **Connect-only.** Never add a signing or transaction call to this app. It's the app's entire premise and its security story.
- **The hand-off is user-confirmed.** Do not restore an automatic redirect on the connected screen; the user must be able to inspect the returned account and change wallet before anything leaves the page.
- **UI is built from `@dynamic-demos/ui`** (`ListRow`, `Input`, `Button`, `Spinner`, `Skeleton`, `ErrorBanner`, `FireblocksLogomark`). Two deliberate exceptions: deeplink actions stay real `<a>` elements, because iOS ignores universal links opened programmatically inside a webview and only honours a genuine anchor tap; and the connected-wallet summary row stays bespoke, because `ListRow` renders a `<button>` and that row is read-only. `--widget-*` aliases in `app/globals.css` are what make these components themeable here.
- `/connect` and `/headless` stay chromeless - see Routes.
- Every route is public. No auth gate, no `createDemoMiddleware`; this app uses `createConfigForwardingMiddleware`.
- Extension registration order in `lib/dynamic-client.ts` is load-bearing: chains first, WalletConnect only after `initializeClient()` resolves (its provider recovery needs project settings, which don't exist before init).
- The Dynamic client is a **lazy browser-only singleton**. Do not move `createDynamicClient` to module scope - it reads `window.location`.
- Guide content is upstream's own, rendered through `components/docs-sections.tsx`. Don't author replacement prose - restyle, don't rewrite.

## Gotchas

- **SDK pinned to 1.19.1, not `catalog:`.** The catalog is on 0.25.0, which predates the APIs this flow needs (`react-hooks`, `evm/base-account`, `solana` Phantom redirect, MetaMask URI connectors). `apps/wallet` is on the same pin; `react-hooks` and `metamask` only publish up to 1.20.0, so treat 1.19.1 as the shared floor when bumping.
- **The flow loads with `ssr: false`** (`components/connect-flow-lazy.tsx`). It reads `window.location` during render for the incoming params, and wallet discovery is browser-only, so there is nothing to server-render. Don't "fix" this by adding `typeof window` guards throughout.
- **`/` reads `native/` off disk** - upstream used Vite's `?raw` imports, which Next has no equivalent for; `lib/native-sources.ts` reads them server-side instead. That route is dynamic (it reads headers for theming), so the reads happen per-request and `outputFileTracingIncludes` in `next.config.ts` must keep those files in the bundle. Add a file there and you must add it to both.
- **There is no `/docs` route, and no `headless.html`.** Both existed earlier and were removed; anything still pointing at them is stale. The guide lives only in the scenario page's panel, and the engine is the `/headless` route.
- **The React Native section has no surface.** `docs-sections.tsx` still authors it, but the tabs cover Web / iOS / Android only and the route that exposed it is gone. `sources.rn` is still read and serialized for nothing. Either add a tab (`PLATFORMS` + `HAS_MODES` + `sectionFor` in `components/platform-panel.tsx`) or drop the section and its loader entry.
- **`native/` is reference material only.** Excluded from `tsconfig.json`, eslint, and the Next build. It has its own nested `package.json` files; the `apps/*` workspace glob is not recursive, so pnpm ignores them.
- **The headless engine boots explicitly**, not on import (`startHeadlessEngine()`), and guards against React strict-mode double-invocation - re-announcing `ready` would make a native host think a second engine came up.
- **Webview detection is a heuristic.** `lib/runtime-env.ts` sniffs the UA because iOS gives no reliable flag; `ASWebAuthenticationSession` keeps the Safari token and can't be told apart from a real tab. Hosts should pass `?embedded=1`. Use `?debug` on a real device to see the raw signals.
- **Deeplinks are rendered as real `<a>` taps, not `location.href`.** Inside a WKWebView iOS ignores universal links opened programmatically but honours a genuine anchor tap.
- Wallet icons are arbitrary remote URLs from the catalogue (~600 hosts), so `next/image` can't cover them and `@next/next/no-img-element` is off.
- **Two style systems meet on these elements, and both directions fail silently.** `app/connect-flow.css` is `@import`ed *unlayered* while Tailwind's classes live in `@layer utilities`, and unlayered beats layered whatever the source order - so a utility that fights a property this stylesheet already sets does nothing at all (`mt-4 mb-0` on a `.card__subtitle` lost to its `margin` shorthand and silently rendered upstream's spacing). Put the value in the stylesheet instead. In the other direction, a `@dynamic-demos/ui` component's own defaults beat the geometry a `connect-flow.css` class used to provide: `Button` carries `h-9 px-4 py-2`, which is what floated the back label ~13px off the card's top gutter after that control moved from `.back` to `Button`. Neither failure shows up in typecheck, lint, or a diff - check the computed value in the served CSS. Making utilities win globally means `@import "./connect-flow.css" layer(components)` in `app/globals.css`, which reshuffles the cascade for the whole file at once; worth doing deliberately, not as a side effect.

## Analytics taxonomy

`<GtmTracker demoSlug="connections">` wraps the tree in `app/layout.tsx`; no-op with `NEXT_PUBLIC_TRACK_URL` unset. Pageviews and heartbeats are automatic (package-owned). No floating `<BookACallCta>`: this widget ships inside an integrator's iframe, where a floating pill would follow it into their product. `ConnectMilestone` (`lib/analytics/milestones.ts`) is the single-source string-literal union backing every `milestone()` call below - renaming any of these is a breaking analytics change.

The funnel is `wallet_selected` → `wallet_connected` → `handoff_confirmed`. The last two are separate events on purpose: the confirmation screen is manual, so the gap between them is what tells us whether asking the user to check the account before continuing costs completions.

| Milestone | Trigger | Props |
|---|---|---|
| `wallet_selected` | A wallet row is tapped, before any connect attempt (so it counts intent, including wallets that turn out not to be installed). | `wallet` |
| `chain_selected` | A chain row is tapped on the multi-chain picker. Not fired when `?chain=` preselects and skips that screen. | `wallet`, `chain` |
| `wallet_connected` | `connectWithWalletProvider` resolves. Extension path only - the WalletConnect and deeplink-return paths don't reach it. | `wallet`, `chain` |
| `handoff_confirmed` | The conversion. Continue / Return to the app is pressed on the confirmation screen. | `wallet`, `chain`, `returnScheme` |
| `manual_address_submitted` | A pasted address passes `detectAddressChain`. | `chain` |
| `connect_failed` | A connect attempt throws. | `wallet` |

**No addresses in props.** A public address is still an identifier, and the redirect params are the integrator's business, not ours. `returnScheme` (`https` vs a custom app scheme) is what distinguishes a web hand-off from a native one.

## Integration map

**Imports:** `@dynamic-demos/dynamic` (client singleton, config forwarder, credential resolution), `@dynamic-demos/ui` (scenario chrome, code panel), `@dynamic-demos/theme` (brand tokens, config fetch), `@dynamic-demos/analytics` (`GtmTracker` + `useTrack` - see Analytics taxonomy), `@dynamic-demos/code-highlight`, `@dynamic-labs-sdk/*`, `qrcode.react`.

**Dashboard:** registered as `DemoConfigKind: "connections"`. Like `flow` and `card` it has **no in-dashboard editor** (`appearanceMode: "none"`) - the theme comes from the prospect and this app owns its config.

## Open questions / known gaps

- **The guide's code blocks have no real syntax highlighting.** `.code` in `app/connect-flow.css` matches `CodeFrame`'s chrome from `@dynamic-demos/ui` (radius, `#0d1117`, white-alpha strip, github-dark foreground) and the body metrics match `.shiki-block`, so the frames read as the same component. But every other demo highlights with Shiki server-side, and these snippets are inline literals inside a client component (`components/docs-sections.tsx`), so they only get comment dimming. Closing it means hoisting ~20 snippets into a server module, highlighting them, and passing HTML down - plus adding the `swift` / `kotlin` / `xml` grammars to `@dynamic-demos/code-highlight`. Deliberately deferred; it's a refactor of upstream's content, not a restyle.
- `http(s)` host allow-listing for `redirect_uri` is not implemented (see Security).
- Non-installed wallets connect by QR/deeplink only; there's no in-app-browser hand-off beyond what the catalogue offers.
- `app/opengraph-image.tsx` emits the shared generic unfurl via `renderDemoOgImage`. It takes no config and no request data, so branded (`?theme=`/`?share=`) and bare URLs unfurl byte-identically - a forwarded prospect link must not reveal who it is for. `noindex` on branded URLs comes free from `createConfigForwardingMiddleware`, but that only stops crawlers, not link previews.
- `lib/__tests__/redirect.test.ts` covers the pure redirect helpers: scheme allow/block decisions (including the `javascript://host` authority form and opaque-scheme rejection), chain detection, Tron rejection, and the outgoing param contract. The block-list is checked before any configured allow-list, so a deployment naming a script scheme still cannot navigate to it.
- `native/` harnesses are carried over essentially verbatim; edits were `/headless.html` → `/headless` (the route moved) and every hardcoded host → `https://connections.dynamic.dev`. That domain has no Vercel project yet, so the harnesses will not connect until it exists; point `baseURLString` / `flowUrl` / `engineURL` at `http://localhost:4013` to run them before then. Otherwise unverified against these routes.
