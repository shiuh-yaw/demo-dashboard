---
name: "@dynamic-demos/utils"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/utils

Cross-package, environment-neutral utility helpers. Single barrel export, no React, no SDK dependencies, no `process.env` reads. Everything here is pure or wraps a single browser primitive.

## Capabilities

- Class-name composition: `cn(...inputs)` — `clsx` + `tailwind-merge`.
- Address formatting: `truncateAddress(address, startLength?, endLength?)`.
- Currency formatting: `formatCurrency(amount, options?)` (+ `FormatCurrencyOptions`).
- Hex color helpers: `hexToRgb(hex)`, `hexToRgbObject(hex)`.
- Clipboard: `copyToClipboard(text)`.

## Public surface

All exports are stable and live at `@dynamic-demos/utils` (single barrel).

- `cn` — Tailwind-aware class merger. (stable)
- `truncateAddress` — wallet address ellipsis. (stable)
- `formatCurrency` + `FormatCurrencyOptions` — locale-aware currency string. (stable)
- `hexToRgb`, `hexToRgbObject` — hex → RGB conversions used by theme injection. (stable)
- `copyToClipboard` — Clipboard API wrapper. (stable)

## Required environment

None. The package reads no environment variables.

## Slots vs invariants

**Slots:**

- Locale + decimals via `FormatCurrencyOptions`.
- Truncation lengths via `truncateAddress` arguments.

**Invariants:**

- Pure or near-pure functions. The only side effect is `navigator.clipboard.writeText`, which is a browser-only API.
- No React, no Next, no SDK imports. Adding any of those breaks the "anywhere" guarantee.
- All helpers must work in both server and client contexts (clipboard excepted).

## Integration map

**Imports:** `clsx`, `tailwind-merge`.
**Imported by:** `@dynamic-demos/ui`, `@dynamic-demos/theme`, every `apps/*` demo.

## Examples

```ts
import { cn, truncateAddress, formatCurrency } from "@dynamic-demos/utils";

const className = cn("px-4 py-2", isActive && "bg-(--brand-primary)");
const display = truncateAddress("0xabc...def123456789"); // 0xabc...6789
const total = formatCurrency(1234.5); // $1,234.50
```

## Do / Don't

- Do: keep helpers small and tree-shakable.
- Do: write a unit test alongside any new helper (Vitest, smoke level OK).
- Don't: add helpers that pull in React, SDKs, or environment lookups.
- Don't: hardcode locale or currency assumptions; accept options arguments.

## Open questions / known gaps

- No tests yet. Add at least smoke coverage for `cn`, `truncateAddress`, `formatCurrency`, `hexToRgb` before the next round of theme work.
- `formatCurrency` always renders USD-style symbols. If a non-USD demo needs full ICU formatting, swap to `Intl.NumberFormat` with `style: "currency"` and a `currency` option.
- `copyToClipboard` silently swallows errors. Surface a typed result if a consumer needs to differentiate denied permission from missing API.
