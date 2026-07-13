# Demo Scenario Page Pilot Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 hero-only `DemoLanding` (already on this branch) with flow's scenario-page shape: wallet's root shows the live widget beside an SDK/API code panel, built from primitives generalized out of `apps/flow` into `packages/ui`.

**Architecture:** `packages/ui` gains flow's scenario chrome (`ScenarioHero`, eyebrow, route chips), a two-column `ScenarioLayout`, and a generalized `CodePanel` family (pill tabs, numbered stepper, dark code frames) with droplet's `Tabs`/`CopyButton`/`cn` replaced by hand-rolled tabs, ui's `CopyButton`, and `cn` from `@dynamic-demos/utils`. Code arrives as pre-highlighted HTML — apps run Shiki server-side. Wallet's `app/page.tsx` becomes an RSC that highlights wallet's snippets and composes hero + live `WalletApp` island + panel. No auth gate anywhere.

**Tech Stack:** Next.js App Router (RSC), React 19, Tailwind v4 (`--brand-*` vars), Shiki 1.24.0 (wallet only), Vitest (node env).

**Spec:** `docs/projects/demo-landing-pilot/SPEC.md` (v2, approved).

## Global Constraints

- `apps/spark26/` is zero-touch. `apps/flow/` is read-only reference in this PR (its migration to the shared primitives is a later PR).
- Only new dependency allowed: `shiki@1.24.0` in `apps/wallet` (matches flow's pin). Lockfile changes are committed, never regenerated wholesale.
- `packages/ui` invariants: no hardcoded hex in classnames **except** the code-frame dark chrome (`#0d1117` + white-alpha text), which is intentionally theme-independent exactly as in flow — document it; no SDK/provider imports; no cookies/headers; React stays a peer dep.
- Token roles (D-030): decorative accents (title accent phrase, hero bullet checks) ride `--brand-accent`; flow's chrome uses `--brand-primary` for step numbers and docs links — keep those as flow has them.
- Copy uses "onchain" (one word), never "on-chain".
- The v1 token canonicalization (defaults.css, TS mirror, 7 app pins, D-030) is already on this branch — do not touch it beyond the one D-030 sentence Task 1 amends.
- Branch: `feat/demo-landing-pilot` (PR #140). `Can't find lefthook in PATH` on commit is a known local condition; proceed, never run bare `pnpm install` except where Task 4 explicitly says to (for the shiki dep).

---

### Task 1: Remove v1 artifacts, restore wallet root, amend D-030

**Files:**
- Delete: `packages/ui/src/demo-landing.tsx`
- Modify: `packages/ui/src/index.ts` (remove the `// Landing template` export block)
- Modify: `packages/ui/AGENTS.md` (remove the three DemoLanding lines: Capabilities bullet, Public-surface bullet, Do/Don't bullet)
- Delete: `apps/wallet/components/wallet-home.tsx`, `apps/wallet/lib/home-surface.ts`, `apps/wallet/__tests__/home-surface.test.ts`, `apps/wallet/components/icons/wallet-illustration.tsx`
- Modify: `apps/wallet/app/page.tsx` (restore pre-landing shape so the branch stays green until Task 4)
- Modify: `apps/wallet/AGENTS.md` (remove the v1 landing bullets: the "Pre-auth landing" Capabilities bullet, the `/` route line reverts to `- \`/\` — main wallet surface.`, and the Theming "Landing note" line)
- Modify: `docs/projects/demo-meta-system/DECISIONS.md` (D-030 last sentence)

**Interfaces:**
- Produces: a branch where nothing references `DemoLanding`/`WalletHome`; wallet `/` renders `ThemedWidgetLayout` + `WalletApp` directly (interim state that Task 4 replaces).

- [ ] **Step 1: Delete the four wallet files and the ui component**

```bash
git rm packages/ui/src/demo-landing.tsx \
  apps/wallet/components/wallet-home.tsx apps/wallet/lib/home-surface.ts \
  apps/wallet/__tests__/home-surface.test.ts \
  apps/wallet/components/icons/wallet-illustration.tsx
```

- [ ] **Step 2: Remove the barrel export block**

In `packages/ui/src/index.ts`, delete the entire block:

```ts
// Landing template
export {
  DemoLanding,
  DemoLandingSection,
  type DemoLandingProps,
  type DemoLandingCta,
  type DemoLandingSectionProps,
} from "./demo-landing";
```

- [ ] **Step 3: Restore `apps/wallet/app/page.tsx`**

Replace the whole file with the pre-landing shape (verify against `git show 5143198:apps/wallet/app/page.tsx` — it should match this exactly):

```tsx
/**
 * Main Application Entry Point (Server Component)
 *
 * Per-config theming (`?theme=<configId>`) is fully handled at the layout
 * level: middleware forwards the id as `x-wallet-config-id`, layout.tsx
 * fetches the config server-side and emits theme overrides via
 * `<ThemeStyleTag>` plus a `<WalletConfigProvider>` for branding access.
 *
 * This page renders the layout shell + delegates wallet logic to the
 * `WalletApp` client component (Dynamic SDK requires client-side JS).
 */

import { ThemedWidgetLayout } from "@/components/ui/themed-widget-layout";
import { WalletApp } from "@/components/wallet-app";

export default function Home() {
  return (
    <ThemedWidgetLayout>
      <WalletApp />
    </ThemedWidgetLayout>
  );
}
```

- [ ] **Step 4: Remove the v1 AGENTS.md lines**

- `packages/ui/AGENTS.md`: delete the Capabilities bullet starting `- Landing template:`, the Public-surface bullet starting `- Landing —`, and the Do/Don't bullet mentioning `DemoLanding-family`.
- `apps/wallet/AGENTS.md`: delete the Capabilities bullet starting `- Pre-auth landing —`; revert the `/` route line to `- \`/\` — main wallet surface.`; delete the Theming line starting `Landing note:`.

- [ ] **Step 5: Amend D-030's reference-implementation sentence**

In `docs/projects/demo-meta-system/DECISIONS.md` D-030, replace the final sentence

> `Shared components map tokens by role: decorative accents ride --brand-accent, CTAs ride --brand-primary/--brand-primary-fg (the DemoLanding template in packages/ui is the reference implementation).`

with

> `Shared components map tokens by role: decorative accents ride --brand-accent, primary actions and integration-affordance accents (step numbers, docs links) ride --brand-primary/--brand-primary-fg (the scenario-page primitives in packages/ui — ScenarioHero + CodePanel — are the reference implementation).`

- [ ] **Step 6: Verify green**

Run: `grep -rn "DemoLanding\|WalletHome\|home-surface\|wallet-illustration" packages/ui/src apps/wallet --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: no output.
Run: `pnpm turbo typecheck lint test --filter=@dynamic-demos/wallet`
Expected: PASS (15 tests — the 4 gate tests are gone).
Run (from `packages/ui`): `pnpm exec tsc --noEmit --rootDir . -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A packages/ui apps/wallet docs/projects/demo-meta-system/DECISIONS.md
git commit -m "revert(ui,wallet): remove v1 hero-only DemoLanding + wallet gate (direction change to scenario page)"
```

---

### Task 2: `packages/ui` scenario chrome + layout

**Files:**
- Create: `packages/ui/src/scenario-chrome.tsx`
- Create: `packages/ui/src/scenario-layout.tsx`
- Modify: `packages/ui/src/index.ts` (barrel)
- Modify: `packages/ui/AGENTS.md`

**Interfaces:**
- Produces (Tasks 3–4 rely on these exact names):
  - `ScenarioEyebrow({ num, name }: { num: string; name: string })`
  - `RouteChip({ icon, label, detail }: { icon: ReactNode; label: string; detail: string })`, `ChipArrow()`
  - `ScenarioHero(props: ScenarioHeroProps)` where `interface ScenarioHeroProps { logo?: ReactNode; eyebrow: { num: string; name: string }; title: string; titleAccent?: string; pitch: ReactNode; bullets?: string[]; chips?: ReactNode }`
  - `ScenarioLayout({ hero, demo, panel, footer }: { hero: ReactNode; demo: ReactNode; panel: ReactNode; footer?: ReactNode })`

- [ ] **Step 1: Create `packages/ui/src/scenario-chrome.tsx`**

```tsx
/**
 * Scenario-page chrome — generalized from apps/flow/components/
 * scenario-chrome.tsx (demos-surface phase 2 v2). Flow's visual
 * language verbatim; per-app copy, icons, and logos arrive as props.
 * Flow itself still carries its local copy until its migration PR.
 *
 * Token roles (D-030): the title accent phrase and bullet checks ride
 * --brand-accent (visible under charcoal-primary brands like wallet);
 * chips/eyebrow ride the neutral tokens exactly as in flow.
 */

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { DynamicLogo } from "./dynamic-logo";

export function ScenarioEyebrow({ num, name }: { num: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-(--brand-muted) font-medium">
        {num} · {name}
      </span>
      <span className="inline-flex items-center h-5 px-2 rounded-full bg-(--brand-row-bg) text-(--brand-muted) border border-(--brand-border) text-[10px] font-medium uppercase tracking-[0.14em]">
        Demo
      </span>
    </div>
  );
}

export function RouteChip({
  icon,
  label,
  detail,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-(--brand-surface) border border-(--brand-border) pl-2 pr-3 py-1.5">
      <span
        aria-hidden
        className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-[6px]"
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold text-(--brand-fg)">
          {label}
        </span>
        <span className="text-[10px] text-(--brand-muted)">{detail}</span>
      </span>
    </div>
  );
}

export function ChipArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="text-(--brand-muted) shrink-0"
      aria-hidden
    >
      <path
        d="M2 7h10m0 0L8 3m4 4L8 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ScenarioHeroProps {
  /** App's brand logo node. Defaults to the Dynamic wordmark. */
  logo?: ReactNode;
  eyebrow: { num: string; name: string };
  title: string;
  /** Trailing headline phrase rendered in --brand-accent. */
  titleAccent?: string;
  /** Subhead. ReactNode so apps can embed cites/links. */
  pitch: ReactNode;
  /** Optional "what to try" items with check icons. */
  bullets?: string[];
  /** Route chips row: compose from RouteChip + ChipArrow. */
  chips?: ReactNode;
}

export function ScenarioHero({
  logo,
  eyebrow,
  title,
  titleAccent,
  pitch,
  bullets,
  chips,
}: ScenarioHeroProps) {
  return (
    <>
      <div className="mb-8">
        {logo ?? <DynamicLogo wordmark className="h-8 w-auto" />}
      </div>
      <section className="flex flex-col gap-5 max-w-3xl">
        <ScenarioEyebrow num={eyebrow.num} name={eyebrow.name} />

        <h1 className="!text-[clamp(2rem,4vw,3rem)] !leading-[1.05] text-balance text-(--brand-fg) font-semibold tracking-[-0.02em]">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="text-(--brand-accent)">{titleAccent}</span>
            </>
          ) : null}
        </h1>

        <p className="text-base lg:text-lg text-(--brand-fg-secondary) max-w-2xl">
          {pitch}
        </p>

        {bullets && bullets.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-sm text-(--brand-fg-secondary)"
              >
                <Check
                  aria-hidden
                  strokeWidth={2.5}
                  className="mt-0.5 h-4 w-4 shrink-0 text-(--brand-accent)"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {chips ? (
          <div className="flex items-center gap-3 pt-1 flex-wrap">{chips}</div>
        ) : null}
      </section>
    </>
  );
}
```

- [ ] **Step 2: Create `packages/ui/src/scenario-layout.tsx`**

```tsx
/**
 * Scenario-page shell — flow's two-column arrangement (live demo left,
 * code panel right; stacked demo-first below lg). Generalized from
 * apps/flow/app/checkout/page.tsx's layout markup.
 */

import type { ReactNode } from "react";

export function ScenarioLayout({
  hero,
  demo,
  panel,
  footer,
}: {
  hero: ReactNode;
  demo: ReactNode;
  panel: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-(--brand-page-bg)">
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        {hero}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
            {demo}
          </div>
          <div className="lg:col-span-7">{panel}</div>
        </div>
        {footer ? (
          <div className="mt-16 flex justify-center">{footer}</div>
        ) : null}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Barrel exports**

In `packages/ui/src/index.ts`, after the `// Layout components` block, add:

```ts
// Scenario-page primitives (demos-surface phase 2 v2)
export {
  ScenarioEyebrow,
  RouteChip,
  ChipArrow,
  ScenarioHero,
  type ScenarioHeroProps,
} from "./scenario-chrome";
export { ScenarioLayout } from "./scenario-layout";
```

- [ ] **Step 4: Compile check**

Run (from `packages/ui`): `pnpm exec tsc --noEmit --rootDir . -p tsconfig.json`
Expected: exit 0. (`pnpm turbo typecheck --filter=@dynamic-demos/ui` is a no-op — the package has no scripts.)

- [ ] **Step 5: Update `packages/ui/AGENTS.md`**

- Capabilities: add `- Scenario-page primitives: \`ScenarioHero\`, \`ScenarioEyebrow\`, \`RouteChip\`/\`ChipArrow\`, \`ScenarioLayout\` — flow's scenario-page chrome, generalized (demos-surface phase 2 v2).`
- Public surface: add `- Scenario — \`ScenarioHero\`, \`ScenarioEyebrow\`, \`RouteChip\`, \`ChipArrow\`, \`ScenarioLayout\`.`

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/scenario-chrome.tsx packages/ui/src/scenario-layout.tsx packages/ui/src/index.ts packages/ui/AGENTS.md
git commit -m "feat(ui): scenario chrome + layout primitives generalized from flow"
```

---

### Task 3: `packages/ui` CodePanel family

**Files:**
- Create: `packages/ui/src/code-panel-types.ts`
- Create: `packages/ui/src/code-panel-atoms.tsx`
- Create: `packages/ui/src/code-panel-stepper.tsx`
- Create: `packages/ui/src/code-panel.tsx`
- Modify: `packages/ui/src/index.ts`, `packages/ui/AGENTS.md`

**Interfaces:**
- Consumes: `CopyButton` (ui), `cn` from `@dynamic-demos/utils` (already a dep).
- Produces (Task 4 relies on these exact names):
  - `interface CodeStep { num: string; title: string; prose: string; filename: string; rawCode: string; html: string; docsUrl: string }`
  - `interface CodePanelProps { sdkSteps: CodeStep[]; apiSteps?: CodeStep[]; webhooksPane?: ReactNode; notice?: ReactNode }`
  - `CodePanel(props: CodePanelProps)` — `"use client"`.
  - `CodeFrame({ filename, html, rawCode })`, `DocsLink({ href })`, `renderProse(text)`, `Stepper({ steps })` (also exported for future flow migration).
- **Consumer requirement (document, don't solve here):** `CodeFrame` renders Shiki HTML that needs the `.shiki-block` CSS — consuming apps must include it in their globals (Task 4 adds it to wallet; flow already has it).

- [ ] **Step 1: Create `packages/ui/src/code-panel-types.ts`**

```ts
/**
 * Public types for <CodePanel /> and its panes. Generalized from
 * apps/flow/components/code-panel-types.ts: only the step contract is
 * lifted; flow's helpers/webhooks/AI card types stay flow-local until
 * its migration PR. Code is carried as pre-highlighted HTML (`html`)
 * plus the raw string (`rawCode`) for the copy button — this package
 * takes no Shiki dependency; apps highlight server-side.
 */

export interface CodeStep {
  num: string;
  title: string;
  /** `backtick` spans render as inline code chips via renderProse. */
  prose: string;
  filename: string;
  rawCode: string;
  /** Shiki-highlighted HTML for the code block. */
  html: string;
  /** Canonical docs URL surfaced as the step's "Docs →" link. */
  docsUrl: string;
}

export interface CodePanelProps {
  sdkSteps: CodeStep[];
  /** Optional — the API tab renders only when provided. */
  apiSteps?: CodeStep[];
  /** Optional — a Webhooks tab renders this node when provided. */
  webhooksPane?: React.ReactNode;
  /** Optional notice rendered above every pane (e.g. sandbox note). */
  notice?: React.ReactNode;
}
```

- [ ] **Step 2: Create `packages/ui/src/code-panel-atoms.tsx`**

```tsx
"use client";

/**
 * Shared atoms for <CodePanel /> panes — generalized from
 * apps/flow/components/code-panel-atoms.tsx with droplet's CopyButton
 * swapped for this package's own.
 *
 * The dark code-frame chrome (#0d1117 + white-alpha strip) is
 * intentionally theme-independent — code blocks read as "terminal"
 * under any brand — and is the one sanctioned hex exception in this
 * package (see AGENTS.md).
 *
 * Consumers must include the `.shiki-block` CSS in their app globals
 * (line numbers, padding, transparent background); see the wallet or
 * flow globals.css for the canonical block.
 */

import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";

export function CodeFrame({
  filename,
  html,
  rawCode,
}: {
  filename: string;
  html: string;
  rawCode: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-(--brand-border) bg-[#0d1117]">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.08]">
        <span className="text-[11px] text-white/55 font-mono">{filename}</span>
        <CopyButton
          text={rawCode}
          size="sm"
          className="text-white/55 hover:text-white"
        />
      </div>
      <div className="shiki-block" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function DocsLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group/docs inline-flex items-center gap-1 text-[12px] font-medium text-(--brand-primary) hover:text-(--brand-primary-hover) transition-colors shrink-0"
    >
      Docs
      <span className="transition-transform group-hover/docs:translate-x-0.5">
        <DocsArrow />
      </span>
    </a>
  );
}

function DocsArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Render a prose string with `backtick`-delimited spans as inline code
 * chips. Cheap markdown subset — inline code only.
 */
export function renderProse(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-(--brand-row-bg) border border-(--brand-border) text-(--brand-fg)"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
```

- [ ] **Step 3: Create `packages/ui/src/code-panel-stepper.tsx`**

```tsx
"use client";

/**
 * Numbered integration stepper for the SDK/API panes — generalized
 * from apps/flow/components/code-panel-stepper.tsx (cn now comes from
 * @dynamic-demos/utils).
 */

import { cn } from "@dynamic-demos/utils";
import { CodeFrame, DocsLink, renderProse } from "./code-panel-atoms";
import type { CodeStep } from "./code-panel-types";

export function Stepper({ steps }: { steps: CodeStep[] }) {
  return (
    <ol
      className="relative flex flex-col m-0 p-0"
      style={{ listStyle: "none" }}
    >
      <span
        aria-hidden
        className="absolute left-[13.5px] top-3.5 bottom-3.5 w-px bg-(--brand-border)"
      />
      {steps.map((step, i) => (
        <li
          key={step.num}
          className={cn("relative pl-11", i < steps.length - 1 && "pb-8")}
        >
          <span
            aria-hidden
            className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-(--brand-surface) border-[1.5px] border-(--brand-primary) text-[11px] font-mono font-semibold text-(--brand-primary)"
          >
            {step.num}
          </span>
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-[15px] font-semibold text-(--brand-fg) leading-snug">
                {step.title}
              </h3>
              <DocsLink href={step.docsUrl} />
            </div>
            <p className="text-sm text-(--brand-fg-secondary) leading-relaxed">
              {renderProse(step.prose)}
            </p>
          </div>
          <CodeFrame
            filename={step.filename}
            html={step.html}
            rawCode={step.rawCode}
          />
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Create `packages/ui/src/code-panel.tsx`**

```tsx
"use client";

/**
 * Right-rail integration panel — generalized from
 * apps/flow/components/code-panel.tsx. Tabs render only for the panes
 * provided (SDK always; API and Webhooks when passed). Droplet's Tabs
 * is replaced by a hand-rolled pill tab row with the same styling.
 * URL-hash deep links (#sdk, #api, #webhooks) are preserved.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { Stepper } from "./code-panel-stepper";
import type { CodePanelProps } from "./code-panel-types";

export type { CodeStep, CodePanelProps } from "./code-panel-types";

type TabId = "sdk" | "api" | "webhooks";

function setHash(hash: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#${hash}`);
}

export function CodePanel({
  sdkSteps,
  apiSteps,
  webhooksPane,
  notice,
}: CodePanelProps) {
  const tabs = useMemo<Array<{ id: TabId; label: string }>>(
    () => [
      { id: "sdk" as const, label: "SDK" },
      ...(apiSteps ? [{ id: "api" as const, label: "API" }] : []),
      ...(webhooksPane
        ? [{ id: "webhooks" as const, label: "Webhooks" }]
        : []),
    ],
    [apiSteps, webhooksPane],
  );
  const [activeTab, setActiveTab] = useState<TabId>("sdk");

  // Hash deep-links are read after mount so server and client agree on
  // the initial tab ("sdk") during hydration.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (tabs.some((t) => t.id === hash)) setActiveTab(hash as TabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only read
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setHash(tab);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {tabs.length > 1 ? (
        <div
          role="tablist"
          className="self-start inline-flex bg-(--brand-row-bg) border border-(--brand-border) rounded-full p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-(--brand-surface) text-(--brand-fg) shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "text-(--brand-muted)",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {notice}

      {activeTab === "sdk" ? <Stepper steps={sdkSteps} /> : null}
      {activeTab === "api" && apiSteps ? <Stepper steps={apiSteps} /> : null}
      {activeTab === "webhooks" && webhooksPane ? webhooksPane : null}
    </div>
  );
}
```

- [ ] **Step 5: Barrel exports**

In `packages/ui/src/index.ts`, after the scenario-primitives block from Task 2, add:

```ts
export {
  CodePanel,
  type CodeStep,
  type CodePanelProps,
} from "./code-panel";
export { CodeFrame, DocsLink, renderProse } from "./code-panel-atoms";
export { Stepper } from "./code-panel-stepper";
```

- [ ] **Step 6: Compile check**

Run (from `packages/ui`): `pnpm exec tsc --noEmit --rootDir . -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 7: Update `packages/ui/AGENTS.md`**

- Capabilities: add `- Integration code panel: \`CodePanel\` (pill tabs, hash deep-links), \`Stepper\`, \`CodeFrame\`, \`DocsLink\`, \`renderProse\` — content arrives as pre-highlighted HTML (\`CodeStep\`); the package has no Shiki dependency.`
- Public surface: add `- Code panel — \`CodePanel\`, \`Stepper\`, \`CodeFrame\`, \`DocsLink\`, \`renderProse\`, \`CodeStep\`, \`CodePanelProps\`.`
- Do/Don't: add `- Do: pass pre-highlighted Shiki HTML into \`CodeStep.html\` (highlight server-side in the app) and include the \`.shiki-block\` CSS in the app's globals — see apps/wallet or apps/flow.` and `- Note: the code-frame dark chrome (\`#0d1117\`, white-alpha strip) is the one sanctioned hex exception — code blocks are deliberately theme-independent.`

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/code-panel-types.ts packages/ui/src/code-panel-atoms.tsx \
  packages/ui/src/code-panel-stepper.tsx packages/ui/src/code-panel.tsx \
  packages/ui/src/index.ts packages/ui/AGENTS.md
git commit -m "feat(ui): CodePanel family generalized from flow (pill tabs, stepper, code frames; no shiki dep)"
```

---

### Task 4: Wallet scenario page

**Files:**
- Modify: `apps/wallet/package.json` (+ `"shiki": "1.24.0"` in dependencies) and the workspace lockfile
- Create: `apps/wallet/lib/code-highlight.ts`
- Create: `apps/wallet/lib/code-steps.ts`
- Create: `apps/wallet/components/scenario-brand-logo.tsx`
- Modify: `apps/wallet/app/page.tsx`
- Modify: `apps/wallet/app/globals.css` (append `.shiki-block` CSS)
- Test: `apps/wallet/__tests__/code-steps.test.ts`
- Modify: `apps/wallet/AGENTS.md`

**Interfaces:**
- Consumes: `ScenarioHero`, `RouteChip`, `ChipArrow`, `ScenarioLayout`, `CodePanel`, `type CodeStep`, `PoweredByFooter`, `DynamicLogo` from `@dynamic-demos/ui` (Tasks 2–3); `useWalletConfig` from `@/contexts/wallet-config-context`; `WalletApp`, `WidgetCard` (existing).
- Produces: `WALLET_SDK_STEPS` / `WALLET_API_STEPS` (`StepSource[]` — see below), `buildCodeSteps(sources: StepSource[]): Promise<CodeStep[]>`, `highlight(code, lang): Promise<string>`.

- [ ] **Step 1: Add the shiki dependency**

In `apps/wallet/package.json` dependencies, add `"shiki": "1.24.0"` (alphabetical position). Then run:

```bash
pnpm install --filter @dynamic-demos/wallet
```

Expected: lockfile gains shiki entries for wallet only. Run `git diff --stat pnpm-lock.yaml` and confirm the diff is small and shiki-related; if unrelated packages moved, STOP and report (do not commit a churned lockfile).

- [ ] **Step 2: Write the failing test**

Create `apps/wallet/__tests__/code-steps.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  WALLET_SDK_STEPS,
  WALLET_API_STEPS,
  buildCodeSteps,
} from "../lib/code-steps";

describe("wallet code-step content", () => {
  const all = [...WALLET_SDK_STEPS, ...WALLET_API_STEPS];

  it("every step carries non-empty content", () => {
    expect(WALLET_SDK_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(WALLET_API_STEPS.length).toBeGreaterThanOrEqual(2);
    for (const step of all) {
      expect(step.num).toMatch(/^\d\d$/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.prose.length).toBeGreaterThan(0);
      expect(step.filename.length).toBeGreaterThan(0);
      expect(step.code.trim().length).toBeGreaterThan(0);
    }
  });

  it("docs URLs point at dynamic.xyz docs", () => {
    for (const step of all) {
      expect(step.docsUrl).toMatch(/^https:\/\/(www\.)?dynamic\.xyz\/docs\//);
    }
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(WALLET_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(WALLET_SDK_STEPS[0]!.code);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @dynamic-demos/wallet exec vitest run __tests__/code-steps.test.ts`
Expected: FAIL — cannot resolve `../lib/code-steps`.

- [ ] **Step 4: Create `apps/wallet/lib/code-highlight.ts`**

```ts
import { createHighlighter, type Highlighter } from "shiki";

/**
 * Server-side Shiki highlighter — flow's lazy-singleton pattern
 * (apps/flow/lib/code-highlight.ts). Only imported from server
 * components/tests; no "server-only" marker because that package
 * isn't a declared workspace dep (flow relies on hoisting; we don't).
 */

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["typescript", "bash"],
    });
  }
  return highlighterPromise;
}

export type HighlightLang = "typescript" | "bash";

export async function highlight(
  code: string,
  lang: HighlightLang,
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, { lang, theme: "github-dark" });
}
```

- [ ] **Step 5: Create `apps/wallet/lib/code-steps.ts`**

Wallet-owned panel content (per-app-content rule). The snippets must mirror the app's REAL implementation — before finalizing each snippet, check the named source file and correct any signature drift, keeping the step structure:

```ts
import type { CodeStep } from "@dynamic-demos/ui";
import { highlight, type HighlightLang } from "./code-highlight";

/**
 * Integration-panel content for wallet's scenario page. Each snippet
 * mirrors the live implementation (file named in `filename`); if the
 * wallet code changes, update the matching snippet in the same PR.
 */

export interface StepSource {
  num: string;
  title: string;
  prose: string;
  filename: string;
  lang: HighlightLang;
  code: string;
  docsUrl: string;
}

export const WALLET_SDK_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Create the client",
    prose:
      "One Dynamic client per app, created at module scope. Chain extensions register which networks the embedded wallet supports.",
    filename: "lib/dynamic/client.ts",
    lang: "typescript",
    code: `import { createClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";

export const client = createClient({
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
}).extend(addEvmExtension());`,
    docsUrl: "https://www.dynamic.xyz/docs/overview/wallets/overview",
  },
  {
    num: "02",
    title: "Sign in with an email code",
    prose:
      "Send a one-time passcode and verify it. No password, no seed phrase — the session lives in the client.",
    filename: "lib/dynamic/auth-email.ts",
    lang: "typescript",
    code: `const otp = await sendEmailOTP(email);

// User types the 6-digit code from their inbox:
await verifyOTP(otp, code);`,
    docsUrl: "https://www.dynamic.xyz/docs/headless/headless-email",
  },
  {
    num: "03",
    title: "The embedded wallet is ready",
    prose:
      "Verification creates a non-custodial embedded wallet automatically. Read balances across every registered chain.",
    filename: "lib/dynamic/balance.ts",
    lang: "typescript",
    code: `const wallets = client.wallets.userWallets;
const balance = await getBalance(wallets[0]);`,
    docsUrl: "https://www.dynamic.xyz/docs/overview/wallets/overview",
  },
  {
    num: "04",
    title: "Sign and send onchain",
    prose:
      "Wrap the wallet account in a viem-compatible client and send — the user approves in place; keys never leave Dynamic's MPC.",
    filename: "lib/dynamic/evm.ts",
    lang: "typescript",
    code: `const walletClient = await createWalletClientForWalletAccount(wallet);

const hash = await walletClient.sendTransaction({
  to: recipient,
  value: parseEther(amount),
});`,
    docsUrl: "https://www.dynamic.xyz/docs/overview/wallets/overview",
  },
  {
    num: "05",
    title: "Call your API with the session JWT",
    prose:
      "The session mints a short-lived JWT. Send it as a bearer token; your server verifies it against Dynamic's JWKS.",
    filename: "app/jwt/page.tsx",
    lang: "typescript",
    code: `const token = client.auth.token;

const res = await fetch("/api/dev/jwt", {
  headers: { Authorization: \`Bearer \${token}\` },
});`,
    docsUrl:
      "https://www.dynamic.xyz/docs/authentication-methods/how-to-validate-users-on-the-backend",
  },
];

export const WALLET_API_STEPS: StepSource[] = [
  {
    num: "01",
    title: "Verify the JWT server-side",
    prose:
      "Any backend can validate the session token against your environment's JWKS endpoint — no Dynamic SDK required on the server.",
    filename: "terminal",
    lang: "bash",
    code: `curl https://app.dynamic.xyz/api/v0/sdk/$DYNAMIC_ENV_ID/.well-known/jwks`,
    docsUrl:
      "https://www.dynamic.xyz/docs/authentication-methods/how-to-validate-users-on-the-backend",
  },
  {
    num: "02",
    title: "Call the protected route",
    prose:
      "This demo's `/api/dev/jwt` route verifies the bearer token and echoes the authenticated user's wallet.",
    filename: "terminal",
    lang: "bash",
    code: `curl https://wallet.dynamic.dev/api/dev/jwt \\
  -H "Authorization: Bearer $DYNAMIC_SESSION_JWT"`,
    docsUrl:
      "https://www.dynamic.xyz/docs/authentication-methods/how-to-validate-users-on-the-backend",
  },
];

export async function buildCodeSteps(
  sources: StepSource[],
): Promise<CodeStep[]> {
  return Promise.all(
    sources.map(async ({ lang, code, ...rest }) => ({
      ...rest,
      rawCode: code,
      html: await highlight(code, lang),
    })),
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @dynamic-demos/wallet exec vitest run __tests__/code-steps.test.ts`
Expected: PASS (3 tests). Shiki runs fine in node-env vitest; the first run downloads nothing (bundled WASM).

- [ ] **Step 7: Create `apps/wallet/components/scenario-brand-logo.tsx`**

```tsx
"use client";

/**
 * Branding-aware logo for the scenario hero — same custom-logoUrl-or-
 * DynamicLogo logic as ThemedWidgetLayout, as a client island so the
 * page itself stays a server component.
 */

import { DynamicLogo } from "@dynamic-demos/ui";
import { useWalletConfig } from "@/contexts/wallet-config-context";

export function ScenarioBrandLogo() {
  const config = useWalletConfig();
  const branding = config?.branding;

  if (branding?.logo === "custom" && branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.name ? `${branding.name} logo` : "Brand logo"}
        className="h-10 object-contain"
      />
    );
  }
  return <DynamicLogo wordmark className="h-8 w-auto" />;
}
```

- [ ] **Step 8: Rewrite `apps/wallet/app/page.tsx`**

```tsx
/**
 * Wallet scenario page (Server Component) — demos-surface phase 2 v2.
 *
 * Flow's scenario-page shape: hero, then the LIVE wallet widget on the
 * left (login card immediately usable; WalletApp handles auth →
 * dashboard internally) and the integration code panel on the right.
 * Snippets are Shiki-highlighted here, server-side; the shared
 * CodePanel receives finished HTML.
 *
 * Per-config theming (`?theme=`) stays at the layout level
 * (<ThemeStyleTag> + WalletConfigProvider); the hero logo is a client
 * island reading that config.
 */

import {
  ChipArrow,
  CodePanel,
  PoweredByFooter,
  RouteChip,
  ScenarioHero,
  ScenarioLayout,
} from "@dynamic-demos/ui";
import { MailIcon, WalletIcon } from "lucide-react";
import { WalletApp } from "@/components/wallet-app";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import {
  buildCodeSteps,
  WALLET_API_STEPS,
  WALLET_SDK_STEPS,
} from "@/lib/code-steps";

export default async function Home() {
  const [sdkSteps, apiSteps] = await Promise.all([
    buildCodeSteps(WALLET_SDK_STEPS),
    buildCodeSteps(WALLET_API_STEPS),
  ]);

  return (
    <ScenarioLayout
      hero={
        <ScenarioHero
          logo={<ScenarioBrandLogo />}
          eyebrow={{ num: "01", name: "Wallet" }}
          title="A wallet your users control."
          titleAccent="No seed phrase required."
          pitch="Sign in with an email or social account and get a non-custodial wallet in seconds. View balances across chains, sign transactions, and send funds by scanning a QR code — built entirely on Dynamic."
          bullets={[
            "Email and social login — no seed phrase",
            "Multichain balances and native transfers",
            "Scan-to-send with QR recipient capture",
            "Onchain signing with secure API access",
          ]}
          chips={
            <>
              <RouteChip
                icon={<MailIcon className="h-4 w-4 text-(--brand-fg)" />}
                label="Any email"
                detail="OTP or social login"
              />
              <ChipArrow />
              <RouteChip
                icon={<WalletIcon className="h-4 w-4 text-(--brand-fg)" />}
                label="Embedded wallet"
                detail="Non-custodial MPC"
              />
            </>
          }
        />
      }
      demo={
        <div className="mx-auto w-full max-w-[400px]">
          <WalletApp />
        </div>
      }
      panel={<CodePanel sdkSteps={sdkSteps} apiSteps={apiSteps} />}
      footer={<PoweredByFooter />}
    />
  );
}
```

Note: `ThemedWidgetLayout` is no longer used by `/` (the scenario layout replaces the centered shell) — it remains in the tree for any other consumer; do not delete it.

- [ ] **Step 9: Append the `.shiki-block` CSS to `apps/wallet/app/globals.css`**

```css
/*
 * Shiki code blocks inside the shared <CodeFrame> (packages/ui).
 * Copied from apps/flow/app/globals.css — line numbers via CSS
 * counters, transparent background so the frame's #0d1117 shows.
 */
.shiki-block pre.shiki {
  margin: 0;
  padding: 1rem 0;
  font-size: 12.5px;
  line-height: 1.65;
  overflow-x: auto;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  background-color: transparent !important;
}
.shiki-block pre.shiki code {
  counter-reset: shiki-line;
  display: grid;
  min-width: max-content;
}
.shiki-block pre.shiki .line {
  counter-increment: shiki-line;
  padding-right: 1.5rem;
}
.shiki-block pre.shiki .line::before {
  content: counter(shiki-line);
  display: inline-block;
  width: 2.25em;
  padding-right: 1.5em;
  margin-left: 0.5em;
  text-align: right;
  color: rgba(255, 255, 255, 0.22);
  user-select: none;
  -webkit-user-select: none;
}
.shiki-block pre.shiki .line:empty::after {
  content: "\200B";
}
```

- [ ] **Step 10: Verify snippets against the real implementation**

Open each file named in a step's `filename` and confirm the snippet's function names and shapes exist (`sendEmailOTP`/`verifyOTP` in `lib/dynamic/auth-email.ts`, `getBalance` in `lib/dynamic/balance.ts`, `createWalletClientForWalletAccount` in `lib/dynamic/evm.ts`, the bearer-token fetch in `app/jwt/page.tsx`, the client creation in `lib/dynamic/client.ts`). Correct any drift in `code-steps.ts` (snippet text only — keep step count/order), then re-run Step 6's test.

- [ ] **Step 11: Full wallet gate + smoke**

Run: `pnpm turbo typecheck lint test --filter=@dynamic-demos/wallet`
Expected: PASS (18 tests: 15 pre-existing + 3 new).
Smoke: start `pnpm --filter @dynamic-demos/wallet dev` in the background, wait for ready, then:
- `curl -s http://localhost:4003/ | grep -c "shiki"` → ≥ 1 (server-rendered highlighted code present)
- `curl -s http://localhost:4003/ | grep -o "A wallet your users control"` → match (hero SSR'd)
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:4003/jwt` → 200
Kill the dev server.

- [ ] **Step 12: Update `apps/wallet/AGENTS.md`**

- Capabilities: add `- Scenario front door — \`/\` is a flow-style scenario page (shared \`ScenarioHero\`/\`ScenarioLayout\`/\`CodePanel\` from packages/ui): the live wallet widget sits beside an SDK/API integration panel; snippets are Shiki-highlighted server-side (\`lib/code-highlight.ts\`) from wallet-owned content (\`lib/code-steps.ts\`). No auth gate — the login card is live on the page.`
- Public surface `/` line: `- \`/\` — scenario page: live wallet widget + integration code panel.`
- Required environment/deps note: add `\`shiki\` (pinned 1.24.0, same as flow) — server-side code highlighting for the scenario page.`
- Add a gotcha: `Snippets in \`lib/code-steps.ts\` mirror real implementation files (named per step); update them in the same PR when the mirrored code changes.`

- [ ] **Step 13: Commit**

```bash
git add apps/wallet pnpm-lock.yaml
git commit -m "feat(wallet): scenario-page front door — live widget beside SDK/API code panel"
```

---

### Task 5: Docs alignment + full gate + PR update

**Files:**
- Modify: `docs/projects/demo-landing-pilot/SPEC.md` (only if implementation deviated — record deviations; otherwise untouched)
- PR #140 title + description (gh CLI)

**Interfaces:** documentation only.

- [ ] **Step 1: Full workspace gate**

Run: `pnpm turbo typecheck lint test`
Expected: all green (report counts). Known env note: if `@dynamic-demos/dashboard#typecheck` fails with missing `@dynamic-labs-sdk/droplet`, that's the local JFROG_TOKEN gap — `rm -rf apps/dashboard/.next && pnpm install --frozen-lockfile` fixes it; report rather than chase.

- [ ] **Step 2: Update PR #140**

```bash
gh pr edit 140 --title "feat: wallet scenario page pilot — live widget + integration code panel (demos-surface phase 2)"
```

Rewrite the body (via `gh pr edit 140 --body ...`) to describe: (a) the v2 direction (flow scenario-page shape; v1 hero-only landing was built, reviewed, then removed on this branch after direction feedback — spec v2 in `docs/projects/demo-landing-pilot/SPEC.md`); (b) the shared primitives generalized from flow into packages/ui (scenario chrome, layout, CodePanel family; droplet deps swapped; pre-highlighted-HTML contract, no Shiki in the package; flow migrates in a later PR); (c) the untouched v1 token canonicalization (D-030 + 7 pins) with the containment story; (d) heads-ups: `?theme=` chrome untested locally + `widgetThemeToBrandTheme` doesn't emit the 4 new tokens; the dev-only `@tonconnect/ui` hydration warning is pre-existing; commits ran without lefthook locally (manual secret scan clean).

- [ ] **Step 3: Commit any doc deltas**

```bash
git add docs && git commit -m "docs: record v2 implementation deviations" || echo "nothing to commit"
git push
```

---

## Verification checklist (PR readiness)

- [ ] `pnpm turbo typecheck lint test` green; wallet 18/18.
- [ ] Browser verification (controller): desktop scenario page — hero, live login card left, panel right with SDK/API pill tabs, highlighted code with line numbers, docs links; sign-in happens in place (widget → dashboard, page chrome intact); 375px stacks widget-first; `#api` deep link opens the API tab; `/jwt` unchanged.
- [ ] No `DemoLanding` references anywhere; `git grep -n "DemoLanding"` returns only docs history mentions in SPEC v2.
- [ ] Lockfile diff is shiki-only.
- [ ] PR #140 title/body updated.
