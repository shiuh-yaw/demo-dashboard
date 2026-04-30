---
description: Use Tailwind v4 canonical syntax for CSS variables in class names
globs: "*.tsx,*.ts,*.jsx,*.js,*.css"
---

# Tailwind v4 — canonical classes for CSS variables

When a utility uses a **single** custom property (no comma fallback inside the value), prefer Tailwind’s **custom property shorthand** so IDEs and `suggestCanonicalClasses` stay quiet:

- **Do:** `bg-(--widget-success)/10`, `text-(--widget-muted)`, `rounded-(--widget-radius)`, `hover:bg-(--widget-row-hover)`
- **Avoid:** `bg-[var(--widget-success)]/10`, `text-[var(--widget-muted)]`, …

Docs: [Using arbitrary values → CSS variables](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values) — `fill-(--my-brand-color)` is shorthand for `fill-[var(--my-brand-color)]`.

**When to keep `-[var(--x,...)]`:**

- **Comma fallbacks**, e.g. `text-[var(--widget-muted,#9a9a9a)]`, until tokens are guaranteed in `@theme` / `:root` (then switch to `text-(--widget-muted)` only).
- **Non-variable** arbitrary values: `max-w-[7rem]`, shadows, `calc()`, compound `max(...)`, etc.

**Going forward:** After editing classes, apply Quick Fix (Tailwind IntelliSense) or run a canonical-class ESLint fixer (e.g. `eslint-plugin-tailwind-canonical-classes`) in CI if you add it to the app.
