# Phase 4 — Theming primitive + visa-direct cookie pattern

> **Self-contained agent prompt — multi-PR phase, parallelizable per app.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`.

---

## Your role

Establish a single CSS variable contract (`--brand-*`), a default theme sourced from proceeds, and the visa-direct SSR cookie pattern as the standard. Migrate every app (except spark26) to consume the package primitives.

This phase ships as **multiple PRs**:
1. PR 4-defaults — `packages/theme/src/defaults.css` + `themeToCssVars` + `fetchDemoConfig` + `<ThemeStyleTag>`. Color math helpers.
2. PR 4-app-wallet — migrate apps/wallet (already package-aware, lightest first).
3. PR 4-app-remittance.
4. PR 4-app-visa-direct (the reference pattern; migrate last to consume the factory it inspired).
5. PR 4-app-cross-border-ap-ar.
6. PR 4-app-proceeds.
7. PR 4-app-earn (last; hardest due to RGB conversion).

## Wave + dependencies

- Wave 4.
- Depends on Phase 1D merged (`createDemoMiddleware` factory must exist).
- Depends on Phase 3 partially merged (AGENTS.md for `packages/theme` should exist or land in same wave).
- Per-app PRs parallelize once 4-defaults is merged.

## Skills (every PR)

1. `superpowers:using-git-worktrees` — `.worktrees/phase-4-<step>`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development` — `themeToCssVars` snapshot tests, manual visual diff per app.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch. Skip its theme entirely.
- Single CSS variable contract: `--brand-*` (D-007). Never define `--brand-*` locally in app CSS.
- Apps consume the default via `import '@dynamic-demos/theme/defaults.css'` in `globals.css`.
- SSR-only theme injection (D-008). No client-side fetch of theme. No `useEffect` to apply CSS vars.
- Cookie name = `<demoType>_config_id`. Header = `x-<demoType>-config-id`. Hardcoded by `createDemoMiddleware`.
- Visual diff before/after per app — required before merge.

## Required reading

- `apps/proceeds/app/globals.css` — most complete CSS var set today; the source for defaults.
- `apps/visa-direct/middleware.ts` and `apps/visa-direct/lib/visa-direct-config.ts` — the canonical pattern.
- `packages/theme/src/` — current state.
- `apps/<each-app>/` — current theme implementation, layout file, globals.css.
- `DECISIONS.md` D-007, D-008, D-020.

---

## PR 4-defaults — `packages/theme` primitives

### What needs to happen

#### 1. Create `packages/theme/src/defaults.css`

Port `apps/proceeds/app/globals.css` minus app-specific bits. Steps:
- Copy the `:root { ... }` block.
- Rename every `--widget-*` to `--brand-*`. Audit list:
  - `--widget-page-bg` → `--brand-page-bg`
  - `--widget-bg` → `--brand-surface`
  - `--widget-fg` → `--brand-fg`
  - `--widget-primary` → `--brand-primary`
  - `--widget-primary-hover` → `--brand-primary-hover`
  - `--widget-accent` → `--brand-accent`
  - `--widget-card-gradient-start` → `--brand-card-gradient-start`
  - `--widget-card-gradient-end` → `--brand-card-gradient-end`
  - `--widget-row-bg` → `--brand-row-bg`
  - `--widget-row-hover` → `--brand-row-hover`
  - `--widget-row-divider` → `--brand-row-divider`
  - `--widget-strip-bg` → `--brand-strip-bg`
  - `--widget-muted` → `--brand-muted`
  - `--widget-border` → `--brand-border`
  - `--widget-input-border` → `--brand-input-border`
  - `--widget-success` → `--brand-success`
  - `--widget-error` → `--brand-error`
  - `--widget-status-*` → `--brand-status-*`
  - `--widget-radius*` → `--brand-radius*`
- Strip proceeds-specific vars (`--proceeds-navy`, `--proceeds-blue`, `--proceeds-grey`, `--proceeds-gold`, `--proceeds-teal`, `--max-width-content`).
- Refactor component classes (`.heading-page`, `.heading-section`, `.subheading`, `.card`, `.data-table`, `.scrollbar-thin`) to consume vars instead of hardcoded hex.
- Preserve `@layer base` font smoothing + cursor rules (these are useful defaults).

#### 2. `packages/theme/src/themeToCssVars.ts`

```ts
import type { BrandTheme } from './types';

export function themeToCssVars(theme: Partial<BrandTheme>): Record<string, string> {
  return {
    '--brand-primary': theme.primaryColor ?? '#0071e3',
    '--brand-primary-hover': theme.primaryHover ?? darkenHex(theme.primaryColor ?? '#0071e3', 8),
    '--brand-accent': theme.accentColor ?? '#30d158',
    // ... etc, mirroring defaults.css
  };
}
```

Returns a record so callers can render it as either CSS string or React `style` prop.

#### 3. `packages/theme/src/ThemeStyleTag.tsx`

Server component that renders an inline `<style>` block. Used inside the `<head>` of root layouts.

```tsx
export function ThemeStyleTag({ theme }: { theme: Partial<BrandTheme> }) {
  const vars = themeToCssVars(theme);
  const css = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return <style dangerouslySetInnerHTML={{ __html: `:root {\n${css}\n}` }} />;
}
```

Server-only; no `useEffect`, no client-side CSS injection.

#### 4. `packages/theme/src/fetchDemoConfig.ts`

Server-side helper that reads the `x-<demoType>-config-id` header, fetches from dashboard's API, returns merged config.

```ts
export async function fetchDemoConfig<T>(opts: {
  demoType: string;
  id: string | null;
  fallback: T;
  dashboardUrl?: string;
}): Promise<T> { ... }
```

If `id` is null or fetch fails, returns `fallback`. Logs failures but doesn't throw — keeps demos rendering.

#### 5. `packages/theme/src/colorMath.ts`

Promote `darkenHex` (currently in `apps/visa-direct/lib/visa-direct-config.ts`). Add `lightenHex` and `mixHex` while you're there.

```ts
export function darkenHex(hex: string, amount: number): string;
export function lightenHex(hex: string, amount: number): string;
export function mixHex(a: string, b: string, ratio: number): string;
```

Tests for each: known hex → known output.

#### 6. Snapshot tests

`packages/theme/src/__tests__/themeToCssVars.test.ts`:
- Empty theme → all defaults.
- Partial theme → defaults for unspecified, override for specified.
- Hex-format edge cases.

#### 7. `packages/theme/src/index.ts` updates

```ts
export * from './types';
export { themeToCssVars } from './themeToCssVars';
export { ThemeStyleTag } from './ThemeStyleTag';
export { fetchDemoConfig } from './fetchDemoConfig';
export { darkenHex, lightenHex, mixHex } from './colorMath';
// existing exports preserved
```

Plus: configure `package.json` to expose `defaults.css` for app imports (`"./defaults.css": "./src/defaults.css"`).

### Acceptance criteria (PR 4-defaults)

- [ ] `defaults.css` exists with `--brand-*` namespace, refactored from proceeds.
- [ ] `themeToCssVars` works with snapshot tests.
- [ ] `ThemeStyleTag`, `fetchDemoConfig`, `colorMath` exported.
- [ ] No app changed yet (this PR is package-only).
- [ ] CI gates pass.

---

## PR 4-app-<name> — per-app migration

Repeat for each: wallet, remittance, visa-direct, cross-border-ap-ar, proceeds, earn.

### Per-app steps

#### 1. Update `app/globals.css`

```css
@import "tailwindcss";
@import "@dynamic-demos/theme/defaults.css";

@source "../../../packages/ui/src/**/*.tsx";
@source "../../../packages/ui/src/**/*.ts";

/* App-specific overrides ONLY (rarely needed) */
```

Remove all `--widget-*` and app-specific theme variables. They come from defaults.css now.

#### 2. Update `middleware.ts`

```ts
import { createDemoMiddleware } from '@dynamic-demos/dynamic';

export default createDemoMiddleware({
  demoType: '<name>',                    // e.g. 'remittance'
  publicRoutes: ['/login'],
  defaultReturnPath: '/some/path',
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

Should be ~10 lines total.

#### 3. Update `app/layout.tsx`

```tsx
import { headers } from 'next/headers';
import { fetchDemoConfig, ThemeStyleTag } from '@dynamic-demos/theme';
import { DEFAULT_<NAME>_CONFIG } from '@/lib/<name>-config';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const configId = (await headers()).get('x-<name>-config-id');
  const config = await fetchDemoConfig({
    demoType: '<name>',
    id: configId,
    fallback: DEFAULT_<NAME>_CONFIG,
  });

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={config.theme ?? {}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Should reduce from ~50 lines of theme boilerplate to ~15.

#### 4. Update components

Audit components for hardcoded hex values or `--widget-*` references. Replace with `--brand-*`. If a component has app-specific colors not in defaults, evaluate:
- Is it really brand-driven? Move to the brand record.
- Is it a one-off (e.g., a status accent)? Keep local but reference `--brand-*` where possible.

#### 5. Visual diff

Run the app locally before and after migration. Capture screenshots of every distinct screen (login, dashboard, modal flows). Compare side-by-side. **No visual regressions allowed.** If something changes, it's a bug.

#### 6. Snapshot test for theme output

In the app's tests, add a small assertion that `themeToCssVars(DEFAULT_<NAME>_CONFIG.theme)` produces the expected CSS var set.

### Per-app acceptance criteria

- [ ] App's `globals.css` imports `@dynamic-demos/theme/defaults.css` and contains no `--brand-*` definitions.
- [ ] Middleware uses `createDemoMiddleware`.
- [ ] Layout uses `fetchDemoConfig` + `ThemeStyleTag`.
- [ ] Components reference `--brand-*` only.
- [ ] Visual diff confirmed: no regressions.
- [ ] App boots in `pnpm dev` and theme renders correctly.
- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.

### Per-app commit plan

1. `refactor(<app>): import @dynamic-demos/theme defaults.css`
2. `refactor(<app>): use createDemoMiddleware`
3. `refactor(<app>): SSR theme via fetchDemoConfig + ThemeStyleTag`
4. `refactor(<app>): migrate components to --brand-* contract`

### Per-app PR title

`refactor(<app>): Phase 4 — adopt --brand-* contract + SSR theming`

### Per-app PR description

```
## Phase 4-<app> of demo meta-system

Migrates `<app>` to the canonical theming primitive: shared `--brand-*` defaults, SSR-only theme injection via the visa-direct cookie pattern.

### What changed
- `app/globals.css`: imports `@dynamic-demos/theme/defaults.css`; local `--brand-*` definitions removed.
- `middleware.ts`: uses `createDemoMiddleware` from `@dynamic-demos/dynamic`.
- `app/layout.tsx`: uses `fetchDemoConfig` + `<ThemeStyleTag>`.
- Components updated to reference `--brand-*` exclusively.
- Layout boilerplate reduced from ~50 lines to ~15.

### Visual diff
Manual screenshot comparison (before/after) — no regressions.

### Spark26
Untouched.

### References
- `DECISIONS.md` (D-007, D-008, D-020)
- Phase prompt: `docs/projects/demo-meta-system/phases/04-theming.md`
```

## Spark26 exclusion

`apps/spark26/` is **not migrated.** Its `app/globals.css`, `middleware.ts`, `app/layout.tsx`, and components stay as-is. AGENTS.md (Phase 3) documents the exception.

If spark26 ever needs to migrate, schedule it as a separate planned project.

After each PR merges, update the corresponding `PROGRESS.md` row (`4-app-wallet`, `4-app-remittance`, etc.) to `🟢 done`.
