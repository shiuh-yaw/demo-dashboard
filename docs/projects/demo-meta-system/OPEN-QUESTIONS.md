# Open Questions

Decisions that haven't been locked. Most are deferrable; flag them here so they don't get forgotten. When one is resolved, move it to `DECISIONS.md` with a new D-NNN entry and remove from this list.

---

## Q-001 — Vault for shared secrets (post-launch operational)

**Status:** deferred to Phase 8.

**The question:** Where do the dashboard's many shared secrets live? Today: Vercel env vars + `.env.local`. This works at small scale but rotates poorly.

**Options:**
- Doppler (clean Vercel sync, monorepo-aware, free tier OK)
- 1Password Secrets Automation (heavier, single audit surface if team uses 1Password already)
- Stay on Vercel + manual rotation (status quo)

**Recommended:** Doppler when secret count exceeds ~20 or when first secret rotation reveals friction. Until then, Vercel.

---

## Q-002 — Brand asset hosting (logos, images)

**Status:** deferred until a real demo creator can't paste a URL.

**The question:** Brand records hold `logoUrl: string` today. Customer-provided URLs work but break if asset goes away. Should the dashboard offer uploads?

**Options:**
- Defer (current behavior — customer-managed URLs).
- Add Supabase Storage in Phase 8.

**Recommended:** Defer. Add when a specific demo flow needs it.

---

## Q-003 — Internationalization for LATAM-targeted demos

**Status:** deferred; documented gap.

**The question:** Status badges, button labels, currency formatting are English/USD-assumed today. LATAM demos arguably need Portuguese/Spanish.

**Options:**
- Defer until specific demo demands it.
- Add `next-intl` or `react-intl` in Phase 8.

**Recommended:** Defer. Document in `docs/known-gaps.md`.

---

## Q-004 — Demo usage analytics / telemetry

**Status:** deferred to Phase 8.

**The question:** "Did the customer actually finish the flow?" — currently unknown. Sales benefits enormously from telemetry.

**Options:**
- PostHog
- Mixpanel
- Vercel Analytics + custom events
- Skip (no telemetry)

**Recommended:** PostHog (open-source, self-hostable, generous free tier). Phase 8.

---

## Q-005 — Privacy / compliance review for demos handling real funds

**Status:** out of scope; needs separate compliance project.

**The question:** spark26 handles real conference payments; proceeds handles real developer payouts; some demos collect real KYC data. GDPR/CCPA/AML retention, audit logs, PII handling.

**Recommended:** Schedule a compliance review with legal + security after Phase 7 ships.

---

## Q-006 — Dashboard's own theming

**Status:** clarified; never themable.

**The question:** Does the dashboard consume the `--brand-*` system or stay Dynamic-themed?

**Resolution:** Dashboard is the operator UI, not customer-facing. Always Dynamic-themed. Document in dashboard's AGENTS.md so no one tries to theme it.

> Note: this might warrant promotion to DECISIONS.md as D-028.

---

## Q-007 — Skill iteration & telemetry

**Status:** out of scope for v1.

**The question:** Once the skill ships, how do we know what prompts succeed vs fail? Should we log anonymized prompts + outcomes for later analysis / RAG?

**Recommended:** Log structured events from the skill into a debug log in v1. Aggregate analysis is Phase 8+.

---

## Q-008 — Feature flags inside demos

**Status:** out of scope.

**The question:** A demo creator wants to A/B test two payout flows. No story today.

**Options:**
- GrowthBook
- LaunchDarkly
- Vercel Edge Config
- Skip

**Recommended:** Skip until a real demo asks for it.

---

## Q-009 — Skill versioning & breaking-change handling

**Status:** documented; v1 accepts and-restart approach.

**The question:** When the demo-spec schema changes (v1→v2), how do users in a half-finished session get notified?

**v1 answer:** The skill checks `$schema_version` on read. If unsupported, it stops with a clear "regenerate your demo-spec via the dashboard's `Migrate` button" message. v1 doesn't auto-migrate.

> Possibly promote to DECISIONS.md as part of D-021 expansion.

---

## Q-010 — Cross-demo composition

**Status:** out of scope.

**The question:** Should one demo be able to extend another (compose UI, share state)?

**Recommended:** Don't build until requested. Each demo stands alone.

---

## Q-011 — Per-demo Vercel deployment cost management

**Status:** flagged; auto-pause planned in Phase 8.

**The question:** Vercel projects are cheap individually but accumulate. After 50+ demos, costs add up. How do we prune inactive demos?

**Plan:** quarterly CI job lists Vercel projects with no deploys in 90 days, opens cleanup PRs. Engineer reviews.

---

## Q-012 — Real-provider sandbox E2E testing

**Status:** out of scope for this project; manual QA per demo at first ship.

**The question:** Should we run end-to-end tests against actual provider sandboxes in CI (alfredPay, BlindPay, Iron, etc.)?

**Cost:** multi-day setup per provider; flaky network calls in CI.

**Recommended:** Webhook signature verify tests + fixture replay cover the highest-stakes per-package code without real network. Real-provider E2E becomes per-demo manual checklist.

---

## Q-013 — Multi-tenant authorization for dashboard

**Status:** flagged; resolve before any external creator gets dashboard access.

**The question:** Today dashboard checks `ownerId` for write ops; reads are partially open. Should demo creators see only their own demos?

**Recommended:** Add a `role` field to dashboard users (`creator`, `admin`). Listings filter by ownership for `creator` role. Public-read endpoints (`GET /api/<demoType>/[id]`) stay open. Defer until first external creator onboards.

---

## Q-014 — Backwards compatibility for existing demo URLs during Phase 2 migration

**Status:** acceptance criterion locked; just a reminder.

**Resolution:** Phase 2 brand-FK migration must preserve every existing config ID. Backfill creates a Brand row but config IDs don't change. Test explicitly. Listed here so the Phase 2 agent doesn't forget.

---

## Q-015 — `apps/cross-border-ap-ar` future state

**Status:** decided implicitly.

**Resolution:** Keep as a bespoke USD→USDC→MXN demo. Apply Phase 4 theme migration + Phase 3 AGENTS.md authoring like any other app. Don't generalize it into "the canonical sandwich." That role is filled by the meta-system + dashboard scaffolding templates, not a single hand-built app.

> Probably promote to DECISIONS.md as D-029.

---

## Q-016 — `llms.txt` for Dynamic SDK

**Status:** Phase 8 candidate, high-leverage.

**The question:** Should we publish authoritative agent-readable docs (`llms.txt`) for the Dynamic SDK? D-027 makes this possible since we have SDK source access.

**Recommended:** Author a v1 `llms.txt` after Phase 7 ships. Even an MVP version covering core auth + wallet primitives is a step-change for AI-assisted Dynamic integration broadly.

## Q-017 — Context-aware code panel on scenario pages

**Status:** Raised July 10, 2026 (etesenair), during the wallet scenario-page pilot (PR #140). Deliberately deferred — discuss after the pilot ships.

**The question:** Should the scenario page's code panel follow the visitor through the demo — e.g. show the send-transaction snippet while they're on the Send screen, the OTP snippet during login — instead of a static step list?

**Notes:** Would need a lightweight state bridge from the widget (wallet's `useNavigation` screen state) to the panel — e.g. the widget island publishing its current screen and the panel highlighting/scrolling to the matching `CodeStep`. Keep the shared `CodePanel` presentational; the mapping (screen → step) is per-app content like `code-steps.ts`.
