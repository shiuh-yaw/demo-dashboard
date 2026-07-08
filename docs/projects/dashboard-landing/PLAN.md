# Public Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's auth-gated root page with a public, no-auth landing page (hero + demo grid + `/demos/[slug]` detail pages) while the operator UI keeps working unchanged behind auth.

**Architecture:** Next.js route-group split inside `apps/dashboard`: a `(public)` group (no auth, own header/footer chrome) holds `/` and `/demos/[slug]`; an `(operator)` group holds every existing operator route behind the current auth+sidebar layout (moved verbatim from the root layout). Demo cards are driven by a typed, checked-in config file.

**Tech Stack:** Next.js App Router (RSC), Tailwind v4, Vitest (node env), DM Sans (already loaded), lucide-react (already a dep).

**Spec:** `docs/projects/dashboard-landing/SPEC.md` (approved).

## Global Constraints

- Accent color is Dynamic blue `#4779FF`. Aesthetic: refined/professional SDK-gallery (Stripe-samples family), light mode, desktop-first. NOT youthful, no gradient drama.
- Copy always uses "onchain" (one word), never "on-chain".
- Public routes make **zero** auth/session calls and import **no** Dynamic SDK code (`Providers` moves to the operator layout).
- Only the 6 stable demos appear: wallet, trade, earn, checkouts, remittance, proceeds. Never spark26.
- No new env vars, no new dependencies, no API changes, `middleware.ts` untouched.
- Route groups must not change any operator URL (`/brands`, `/checkouts`, … stay identical).
- All work happens in `apps/dashboard/`. Working dir for all commands: repo root unless stated.
- `apps/dashboard/AGENTS.md` must be updated in the same PR (repo hard rule 5).

---

### Task 1: Landing demo config + validation test

**Files:**
- Create: `apps/dashboard/src/lib/landing/demos.ts`
- Test: `apps/dashboard/src/lib/landing/__tests__/demos.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `LandingDemo` interface and `LANDING_DEMOS: LandingDemo[]` plus `getDemoBySlug(slug: string): LandingDemo | undefined` — Tasks 4 and 5 import these from `@/lib/landing/demos`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/src/lib/landing/__tests__/demos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  LANDING_DEMOS,
  getDemoBySlug,
  type LandingDemo,
} from "@/lib/landing/demos";

describe("LANDING_DEMOS config", () => {
  it("contains exactly the six stable demos", () => {
    const slugs = LANDING_DEMOS.map((d) => d.slug).sort();
    expect(slugs).toEqual([
      "checkouts",
      "earn",
      "proceeds",
      "remittance",
      "trade",
      "wallet",
    ]);
  });

  it("has unique slugs", () => {
    const slugs = LANDING_DEMOS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has non-empty copy on every demo", () => {
    for (const demo of LANDING_DEMOS) {
      expect(demo.name.trim().length, demo.slug).toBeGreaterThan(0);
      expect(demo.tagline.trim().length, demo.slug).toBeGreaterThan(0);
      expect(demo.description.trim().length, demo.slug).toBeGreaterThan(0);
      expect(demo.highlights.length, demo.slug).toBeGreaterThanOrEqual(3);
      for (const h of demo.highlights) {
        expect(h.trim().length, demo.slug).toBeGreaterThan(0);
      }
    }
  });

  it("never spells onchain with a hyphen", () => {
    for (const demo of LANDING_DEMOS) {
      const text = [demo.tagline, demo.description, ...demo.highlights]
        .join(" ")
        .toLowerCase();
      expect(text, demo.slug).not.toContain("on-chain");
    }
  });

  it("uses well-formed https URLs when url is set", () => {
    for (const demo of LANDING_DEMOS) {
      if (demo.url !== undefined) {
        const parsed = new URL(demo.url);
        expect(parsed.protocol, demo.slug).toBe("https:");
      }
    }
  });

  it("uses only known categories", () => {
    const valid: LandingDemo["category"][] = ["wallet", "checkout", "offramp"];
    for (const demo of LANDING_DEMOS) {
      expect(valid, demo.slug).toContain(demo.category);
    }
  });
});

describe("getDemoBySlug", () => {
  it("returns the demo for a known slug", () => {
    expect(getDemoBySlug("wallet")?.name).toBe("Wallet");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getDemoBySlug("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dynamic-demos/dashboard test -- src/lib/landing/__tests__/demos.test.ts`
Expected: FAIL — cannot resolve `@/lib/landing/demos`.

- [ ] **Step 3: Write the config**

Create `apps/dashboard/src/lib/landing/demos.ts`:

```ts
/**
 * Landing page demo catalog.
 *
 * Checked-in source of truth for the public landing page at `/` and the
 * detail pages at `/demos/[slug]`. Deployment URLs are filled in as demos
 * get public domains; a missing `url` renders as "Coming soon".
 */

export interface LandingDemo {
  /** Unique, used for /demos/[slug]. */
  slug: string;
  name: string;
  /** One-liner for the card. */
  tagline: string;
  /** Longer copy for the detail page. */
  description: string;
  category: "wallet" | "checkout" | "offramp";
  /** Live deployment; absent → "Coming soon". */
  url?: string;
  /** Feature bullets for the detail page. */
  highlights: string[];
}

export const LANDING_DEMOS: LandingDemo[] = [
  {
    slug: "wallet",
    name: "Wallet",
    tagline: "A non-custodial embedded wallet your users control.",
    description:
      "Give users a self-custodial wallet they access with just an email or social login — no seed phrases required. They can view balances across multiple chains, sign transactions, and send funds by scanning a recipient's QR code. Built entirely on Dynamic, it's the cleanest way to make the wallet itself the product.",
    category: "wallet",
    highlights: [
      "Email and social login, no seed phrase",
      "Multichain balances and native transfers",
      "Scan-to-send with QR recipient capture",
      "Onchain signing with secure API access",
    ],
  },
  {
    slug: "trade",
    name: "Trade",
    tagline: "Trade tokens and prediction markets from one unified portfolio.",
    description:
      "A multi-surface trading experience where users sign in, browse live token markets and event markets, and execute swaps. A single portfolio view unifies trading, earning, and prediction positions side by side. Onchain swaps route through Dynamic-backed orchestration for a seamless execution flow.",
    category: "wallet",
    highlights: [
      "Live token and prediction markets",
      "Onchain token swaps and spot trades",
      "Unified cross-product portfolio view",
      "Email and social login",
    ],
  },
  {
    slug: "earn",
    name: "Earn",
    tagline: "Deposit USDC into curated yield vaults in a few taps.",
    description:
      "A yield experience where users sign in, deposit USDC into curated vaults, and track their positions over time. Deposits and withdrawals are user-signed onchain transactions, so funds stay fully in the user's control. A single deployment can power many branded vault experiences.",
    category: "wallet",
    highlights: [
      "Curated USDC yield vaults",
      "User-signed onchain deposits and withdrawals",
      "Positions dashboard with saved vaults",
      "Email, Google, and SSO login",
    ],
  },
  {
    slug: "checkouts",
    name: "Checkouts",
    tagline: "Pay with crypto across any chain in one checkout.",
    description:
      "A stablecoin checkout experience that lets users pay with crypto and settle across chains automatically. Users authenticate, see a unified multichain balance, and complete a checkout that bridges or swaps assets as needed via Dynamic's Checkout Flow. Balances can even be sourced from a connected exchange like Kraken.",
    category: "checkout",
    highlights: [
      "Pay with crypto on any chain",
      "Automatic cross-chain bridge and swap",
      "Unified multichain balance summary",
      "Connect wallet or exchange balances",
    ],
  },
  {
    slug: "remittance",
    name: "Remittance",
    tagline: "Send stablecoins onchain, deliver fiat to bank accounts abroad.",
    description:
      "A cross-border remittance experience where a sender funds USDC onchain and pays out fiat to recipients across Latin America. Payouts settle to local bank rails — PIX in Brazil, SPEI in Mexico, PSE in Colombia, and more. Users track each transfer from send to delivery with live status updates.",
    category: "offramp",
    highlights: [
      "USDC in, local fiat out",
      "PIX, SPEI, PSE, and ACH rails",
      "Recipient and corridor selection",
      "Live payout status tracking",
    ],
  },
  {
    slug: "proceeds",
    name: "Proceeds",
    tagline: "Convert onchain proceeds to your bank account.",
    description:
      "A merchant experience for moving onchain revenue into fiat. Merchants connect their Dynamic wallet, review balances and full transaction history, and offramp USDC to their bank. Supports US ACH and wire, EU SEPA, and UK Faster Payments.",
    category: "offramp",
    highlights: [
      "USDC to fiat payouts",
      "ACH, wire, SEPA, Faster Payments",
      "Balances and transaction history",
      "Quote, sign, submit, and track",
    ],
  },
];

export function getDemoBySlug(slug: string): LandingDemo | undefined {
  return LANDING_DEMOS.find((demo) => demo.slug === slug);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @dynamic-demos/dashboard test -- src/lib/landing/__tests__/demos.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/landing/
git commit -m "feat(dashboard): add landing demo catalog config"
```

---

### Task 2: Route-group split — operator layout

**Files:**
- Create: `apps/dashboard/src/app/(operator)/layout.tsx`
- Modify: `apps/dashboard/src/app/layout.tsx` (slim down)
- Modify: `apps/dashboard/src/components/sidebar.tsx:25` and `:117` (href `/` → `/brands`)
- Delete: `apps/dashboard/src/app/page.tsx` (exact duplicate of `/brands`)
- Move (git mv): `apps/dashboard/src/app/{brands,checkouts,documentation,earns,remittance,trade,visa-direct,wallets,widgets}` → `apps/dashboard/src/app/(operator)/`

**Interfaces:**
- Consumes: existing `isDashboardAuthenticated`, `getCurrentUser` (`@/lib/auth/session`), `DashboardLoginForm`, `Sidebar`, `Providers` — all unchanged.
- Produces: `(operator)/layout.tsx` owning auth + sidebar + Providers; a slim root layout Task 3 nests the public layout under. Do NOT move `api/`, `error.tsx`, or `not-found.tsx`.

- [ ] **Step 1: Create the operator layout**

Create `apps/dashboard/src/app/(operator)/layout.tsx` (auth logic moved verbatim from the current root layout, plus `Providers` which the public tree must not load):

```tsx
import Providers from "@/lib/providers";
import { getCurrentUser, isDashboardAuthenticated } from "@/lib/auth/session";
import DashboardLoginForm from "@/components/login-form";
import { Sidebar } from "@/components/sidebar";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

/**
 * Operator Layout
 *
 * Auth boundary for the operator UI. Every route in the (operator) group
 * requires a dashboard session; unauthenticated visitors see the login form.
 * Wraps children with Providers (Dynamic SDK init + theme) — the public
 * (public) group intentionally does not load these.
 */
export default async function OperatorLayout({
  children,
}: OperatorLayoutProps) {
  const isAuthenticated = await isDashboardAuthenticated();
  const user = isAuthenticated ? await getCurrentUser() : null;

  return (
    <Providers>
      {!isAuthenticated ? (
        <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
          <DashboardLoginForm />
        </div>
      ) : (
        <div className="min-h-screen bg-[#f8fafc] flex">
          <Sidebar user={user ? { sub: user.sub, email: user.email } : null} />
          <main className="flex-1 ml-16 transition-all duration-200">
            <div className="max-w-5xl mx-auto p-8">{children}</div>
          </main>
        </div>
      )}
    </Providers>
  );
}
```

- [ ] **Step 2: Slim the root layout**

Replace the full contents of `apps/dashboard/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";

import "@/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dynamic Demos",
  description:
    "Live demo apps showcasing wallets, checkouts, and payments built on Dynamic.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root Layout
 *
 * Fonts + global styles only. Auth, providers, and chrome live in the
 * route-group layouts: (operator) for the gated dashboard, (public) for
 * the landing pages.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Move operator routes into the group and delete the duplicate root page**

```bash
cd apps/dashboard/src/app
git mv brands checkouts documentation earns remittance trade visa-direct wallets widgets "(operator)/"
git rm page.tsx
cd -
```

Note: `api/`, `error.tsx`, `not-found.tsx`, `layout.tsx` stay at `src/app/`.

- [ ] **Step 4: Repoint sidebar home links**

In `apps/dashboard/src/components/sidebar.tsx`, two edits:

Line 25 (nav item): change `href: "/",` to `href: "/brands",` (the Brands nav item).
Line 117 (logo): change `<Link href="/">` to `<Link href="/brands">`.

- [ ] **Step 5: Verify typecheck and tests**

Run: `pnpm --filter @dynamic-demos/dashboard typecheck && pnpm --filter @dynamic-demos/dashboard test`
Expected: both PASS. (There is no `/` page right now — Task 3 adds it; that's fine for typecheck/tests.)

- [ ] **Step 6: Commit**

```bash
git add -A apps/dashboard/src
git commit -m "refactor(dashboard): move operator UI behind (operator) route group"
```

---

### Task 3: Public layout — header + footer chrome

**Files:**
- Create: `apps/dashboard/src/app/(public)/layout.tsx`
- Create: `apps/dashboard/src/app/(public)/_components/site-header.tsx`
- Create: `apps/dashboard/src/app/(public)/_components/site-footer.tsx`

**Interfaces:**
- Consumes: `DynamicLogo` from `@/components/dynamic-logo` (existing SVG wordmark component).
- Produces: `(public)/layout.tsx` wrapping Tasks 4–5 pages with `<SiteHeader />` / `<SiteFooter />`. All server components; no `"use client"`, no session calls, no Providers.

- [ ] **Step 1: Create the header**

Create `apps/dashboard/src/app/(public)/_components/site-header.tsx`:

```tsx
import Link from "next/link";
import { DynamicLogo } from "@/components/dynamic-logo";

/**
 * Public site header. No auth/session calls — this renders for anonymous
 * visitors on every (public) route.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <DynamicLogo width={110} height={25} />
          <span className="rounded-md bg-[#4779FF]/10 px-1.5 py-0.5 text-xs font-semibold text-[#4779FF]">
            Demos
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="https://www.dynamic.xyz"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            dynamic.xyz
          </a>
          <a
            href="https://www.dynamic.xyz/docs"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            Docs
          </a>
          <Link
            href="/brands"
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Operator sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create the footer**

Create `apps/dashboard/src/app/(public)/_components/site-footer.tsx`:

```tsx
/**
 * Public site footer with dynamic.xyz links.
 */
export function SiteFooter() {
  const links = [
    { label: "dynamic.xyz", href: "https://www.dynamic.xyz" },
    { label: "Docs", href: "https://www.dynamic.xyz/docs" },
    { label: "GitHub", href: "https://github.com/dynamic-labs" },
  ];

  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-slate-500">
          Demo apps built on{" "}
          <a
            href="https://www.dynamic.xyz"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#4779FF] hover:underline"
          >
            Dynamic
          </a>
          .
        </p>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 transition-colors hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create the public layout**

Create `apps/dashboard/src/app/(public)/layout.tsx`:

```tsx
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Public Layout
 *
 * Chrome for the unauthenticated landing pages. Intentionally makes no
 * auth/session calls and does not load Providers (Dynamic SDK) — keep it
 * that way so the public pages stay static and anonymous.
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter @dynamic-demos/dashboard typecheck`
Expected: PASS. (If `DynamicLogo` doesn't accept `width`/`height` props, check its signature at `apps/dashboard/src/components/dynamic-logo.tsx` and match how `sidebar.tsx:119` calls it.)

- [ ] **Step 5: Commit**

```bash
git add "apps/dashboard/src/app/(public)"
git commit -m "feat(dashboard): add public layout with header and footer"
```

---

### Task 4: Landing page — hero + demo grid

**Files:**
- Create: `apps/dashboard/src/app/(public)/_components/demo-card.tsx`
- Create: `apps/dashboard/src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `LANDING_DEMOS`, `LandingDemo` from `@/lib/landing/demos` (Task 1); public layout (Task 3).
- Produces: `DemoCard({ demo }: { demo: LandingDemo })` and the `/` page. `CATEGORY_STYLES` lives in `demo-card.tsx` and is exported for the detail page (Task 5).

- [ ] **Step 1: Create the demo card**

Create `apps/dashboard/src/app/(public)/_components/demo-card.tsx`:

```tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LandingDemo } from "@/lib/landing/demos";

/** Per-category badge styling; used by the card and the detail page. */
export const CATEGORY_STYLES: Record<
  LandingDemo["category"],
  { label: string; badge: string }
> = {
  wallet: { label: "Wallet", badge: "bg-[#4779FF]/10 text-[#4779FF]" },
  checkout: { label: "Checkout", badge: "bg-violet-500/10 text-violet-600" },
  offramp: { label: "Offramp", badge: "bg-emerald-500/10 text-emerald-600" },
};

export function DemoCard({ demo }: { demo: LandingDemo }) {
  const category = CATEGORY_STYLES[demo.category];

  return (
    <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${category.badge}`}
        >
          {category.label}
        </span>
        {demo.url === undefined && (
          <span className="text-xs font-medium text-slate-400">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        {demo.name}
      </h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">
        {demo.tagline}
      </p>
      <div className="mt-6 flex items-center gap-3">
        {demo.url !== undefined ? (
          <a
            href={demo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-[#4779FF] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#3a66e0]"
          >
            Launch demo
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-400">
            Launch demo
          </span>
        )}
        <Link
          href={`/demos/${demo.slug}`}
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the landing page**

Create `apps/dashboard/src/app/(public)/page.tsx`:

```tsx
import { LANDING_DEMOS } from "@/lib/landing/demos";
import { DemoCard } from "./_components/demo-card";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4779FF]">
            Dynamic Demos
          </p>
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-dm-sans)] text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            See what you can build on Dynamic.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
            Live demo apps for wallets, trading, yield, checkouts, and global
            payouts — every flow powered by the Dynamic SDK.
          </p>
        </div>
      </section>

      {/* Demo grid */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_DEMOS.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verify in the browser**

```bash
pnpm --filter @dynamic-demos/dashboard dev
```

Then: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/`
Expected: `200`. Also `curl -s http://localhost:4000/ | grep -c "Launch demo"` → `6`, and confirm NO login form on `/` (`curl -s http://localhost:4000/ | grep -ci "sign in"` → should only match the header's "Operator sign in"). Stop the dev server after.

- [ ] **Step 4: Commit**

```bash
git add "apps/dashboard/src/app/(public)"
git commit -m "feat(dashboard): public landing page with hero and demo grid"
```

---

### Task 5: Demo detail pages

**Files:**
- Create: `apps/dashboard/src/app/(public)/demos/[slug]/page.tsx`

**Interfaces:**
- Consumes: `LANDING_DEMOS`, `getDemoBySlug` (Task 1); `CATEGORY_STYLES` from `../../_components/demo-card` (Task 4).
- Produces: statically generated `/demos/[slug]` pages; unknown slug → 404.

- [ ] **Step 1: Create the detail page**

Create `apps/dashboard/src/app/(public)/demos/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { LANDING_DEMOS, getDemoBySlug } from "@/lib/landing/demos";
import { CATEGORY_STYLES } from "../../_components/demo-card";

interface DemoPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LANDING_DEMOS.map((demo) => ({ slug: demo.slug }));
}

export async function generateMetadata({
  params,
}: DemoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo) return {};
  return {
    title: `${demo.name} — Dynamic Demos`,
    description: demo.tagline,
  };
}

export default async function DemoDetailPage({ params }: DemoPageProps) {
  const { slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo) notFound();

  const category = CATEGORY_STYLES[demo.category];

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All demos
      </Link>

      <div className="mt-8 flex items-center gap-3">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${category.badge}`}
        >
          {category.label}
        </span>
        {demo.url === undefined && (
          <span className="text-xs font-medium text-slate-400">
            Coming soon
          </span>
        )}
      </div>

      <h1 className="mt-4 font-[family-name:var(--font-dm-sans)] text-4xl font-bold tracking-tight text-slate-900">
        {demo.name}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        {demo.description}
      </p>

      <ul className="mt-8 space-y-3">
        {demo.highlights.map((highlight) => (
          <li key={highlight} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4779FF]" />
            <span className="text-slate-700">{highlight}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        {demo.url !== undefined ? (
          <a
            href={demo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4779FF] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#3a66e0]"
          >
            Launch demo
            <ArrowUpRight className="h-4 w-4" />
          </a>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-slate-100 px-5 py-2.5 font-medium text-slate-400">
            Coming soon
          </span>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify in the browser**

```bash
pnpm --filter @dynamic-demos/dashboard dev
```

Then:
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/demos/wallet` → `200`
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/demos/nope` → `404`

Stop the dev server after.

- [ ] **Step 3: Commit**

```bash
git add "apps/dashboard/src/app/(public)/demos"
git commit -m "feat(dashboard): add /demos/[slug] detail pages"
```

---

### Task 6: AGENTS.md update + full verification

**Files:**
- Modify: `apps/dashboard/AGENTS.md` (Capabilities + Public surface sections)

**Interfaces:**
- Consumes: everything above.
- Produces: a branch ready for PR.

- [ ] **Step 1: Update AGENTS.md**

In `apps/dashboard/AGENTS.md`:

1. In **Capabilities**, add as the first bullet:
```
- Public landing page at `/` (no auth) showcasing the stable demo apps, with detail pages at `/demos/[slug]`. Config-driven via `src/lib/landing/demos.ts` (fill in `url` per demo as public domains land).
```
2. In **Public surface → App routes**, replace the `- `/` — landing.` line with:
```
- `/` — public landing page (no auth); `/demos/[slug]` — public demo detail pages. Rendered by the `(public)` route group, which must stay free of session calls and Providers.
- All operator routes live in the `(operator)` route group, whose layout owns the auth gate (login form when unauthenticated) + sidebar + Providers. Route-group split means operator URLs are unchanged.
```
3. In **Do / Don't**, add:
```
- Don't: add auth/session calls or Dynamic SDK imports to the `(public)` route group — the landing pages are anonymous and static.
```

- [ ] **Step 2: Run the full pre-PR gates**

Run from repo root: `pnpm turbo typecheck lint test --filter=@dynamic-demos/dashboard`
Expected: all PASS.

Then: `pnpm turbo build --filter=@dynamic-demos/dashboard`
Expected: PASS; the build output lists `/` and `/demos/[slug]` as static (○ or ●), operator routes unchanged.

- [ ] **Step 3: Manual auth-boundary check**

```bash
pnpm --filter @dynamic-demos/dashboard dev
```

- `curl -s http://localhost:4000/` — landing HTML, no login form.
- `curl -s http://localhost:4000/brands` — login form present (still gated).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/checkouts` → `200` with login form (gated).

Stop the dev server after.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/AGENTS.md
git commit -m "docs(dashboard): document public landing page in AGENTS.md"
```
