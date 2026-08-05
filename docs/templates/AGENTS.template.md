---
name: <package-or-app-name>
kind: package | app | integration
flow_role: onramp | wallet | bridge | offramp | checkout | payouts | auth | theming | shared-ui | utility
custody: non-custodial | custodial | mixed | n/a
status: stable | experimental | stub
# REQUIRED for flow_role: onramp | offramp — list every supported country + currency + rail.
# Omit entirely for non-region-bound packages (ui, theme, shared utils, bridges, wallets).
regions:
  - country: BR              # ISO 3166-1 alpha-2
    currency: BRL            # ISO 4217
    rails: [pix]
  - country: MX
    currency: MXN
    rails: [spei]
# REQUIRED for any package that wraps a third-party provider.
# Omit entirely for first-party packages (ui, theme, db, internal utils).
provider:
  name: <Partner Name>
  docs: https://...                     # main developer docs landing
  api_reference: https://...            # API reference if separate from docs
  agent_docs: https://.../llms.txt      # LLM-readable docs (or "none" if provider doesn't publish one)
  status_page: https://...              # optional
  changelog: https://...                # optional
---

# <Title>

One-paragraph "what this is and why it exists." Plain English. Read this and you should know whether to keep reading.

## Provider documentation

**Required for any package wrapping an external provider.** Omit entirely for first-party packages.

If you are an AI agent implementing against this provider, **consult the provider's own docs first** — the links below are the source of truth, this file is the local-context layer.

- **Main docs:** [Partner Name docs](https://provider.example/docs)
- **API reference:** [API reference](https://provider.example/api)
- **Agent / LLM docs:** [llms.txt](https://provider.example/llms.txt) — or note `none` if the provider doesn't publish one.
- **Status / changelog:** [status](https://provider.example/status) · [changelog](https://provider.example/changelog)

## Supported regions

**Required for `flow_role: onramp` and `flow_role: offramp` packages.** Omit entirely for non-region-bound packages.

| Country | Currency | Rails | Notes |
|---------|----------|-------|-------|
| BR      | BRL      | PIX   | Sub-minute settlement. Webhook required. |
| MX      | MXN      | SPEI  | Business hours only. |

If region coverage changes, update both this table **and** the `regions` field in frontmatter (the registry queries the frontmatter).

## Capabilities

- Bullet list of what this package/app *does* (verbs).
- Each bullet maps to one thing an AI agent might need.
- Keep to 3–8 bullets.

## Public surface

What the outside world consumes from this. **Stable** vs **internal** must be marked.

- `exportName` — one-line description. (stable)
- `OtherExport` — one-line description. (stable)
- `_internalHelper` — one-line description. (internal — do not import from outside the package)

For apps: list public routes and any URL parameters they accept.

## Required environment

Variables this needs to function. Each line is `NAME — purpose — required/optional`.

- `EXAMPLE_API_KEY` — Auth for X service — required
- `EXAMPLE_BASE_URL` — Override default endpoint — optional

Never hardcode values; reference `.env.example` (which must exist).

## Slots vs invariants

**Slots** are things that change per instance / per consumer / per demo. Configure these freely.

- Brand color
- Currency pair
- Partner choice
- Copy strings

**Invariants** must not change without a deliberate decision. Changing them breaks the contract.

- Non-custodial flow (no escrow accounts hold user funds)
- Transaction state machine transitions
- Validation at the trust boundary
- Specific security guarantees

## Analytics taxonomy

Apps only. Delete this section for packages that emit no events.

State where `<GtmTracker demoSlug="...">` is mounted, whether `<BookACallCta />` is mounted and why/why not, and which module owns the milestone name union. Then one row per event. Keep this table and `lib/analytics/milestones.ts` in sync - renaming an event is a breaking analytics change, and this table is where a reader finds out what a name means.

| Milestone | Trigger | Props |
|---|---|---|
| `<name>` | What user action or state change fires it, and any dedupe (once per session / per load). Note the paths that do NOT reach it. | Prop names, or `none`. |

State explicitly that no addresses, emails, or hashes appear in props - or, if the demo has a real reason to include something identifying, say what and why.

## Integration map

Which other packages/apps does this depend on? Which depend on this? One-liner each.

**Imports:** `@dynamic-demos/theme`, `@dynamic-demos/ui`
**Imported by:** `apps/checkouts`, `apps/wallet`

## Examples

One minimal example showing the canonical usage. Code block, ≤30 lines. No commentary inside the code; explanation goes in prose around it.

```ts
// the smallest working example
```

## Do / Don't

Short, declarative. Capture the gotchas a fresh reader will trip over.

- ✅ Do: pass the user's wallet address from the Dynamic context.
- ❌ Don't: store API keys in client-side code or NEXT_PUBLIC_* vars.
- ✅ Do: validate input with the Zod schema in `lib/validation/`.
- ❌ Don't: bypass the state machine helpers (`submit()`, `fail()`, etc.) with generic update calls.

## Open questions / known gaps

Be honest. If something is stubbed or planned, say so. Future agents reading this will save hours.

- Offramp partner X is stubbed; only onramp Y is wired.
- No tests yet — add at least smoke coverage before depending on this.

---

**Authoring rules for this file:**

- Keep total length under ~200 lines. If you need more, you're documenting too much surface area. (Pre-Phase-5B the cap was 150; the "Dashboard API surface" section for provider packages added enough rows to justify the bump.)
- Update this file in the same PR that changes behavior. Stale AGENTS.md files lie to agents.
- Optimize for "an agent who has never seen this code can use it correctly without reading the source." That's the bar.
