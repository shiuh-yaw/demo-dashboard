---
name: "@dynamic-demos/code-highlight"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/code-highlight

Server-side Shiki highlighter for scenario-page code panels - the lazy-singleton that flow / wallet / earn / trade each carried as a local `lib/code-highlight.ts` copy, promoted so the pin, theme, and language set live in one place.

## Capabilities

- `highlight(code, lang)` - Shiki `codeToHtml` with the `github-dark` theme, cached highlighter across requests.
- `HighlightLang` - `"typescript" | "tsx" | "bash" | "json"` (the union of what the demos render).
- `assertAuthoredCodeSteps(steps)` (from `@dynamic-demos/code-highlight/testing`) - content rules for authored code steps: non-empty fields, two-digit `num`, dynamic.xyz docs links, and every TypeScript snippet opening with its `import` line (snippets must be copy-paste-runnable, not fragments). Framework-agnostic (throws plain `Error`s); the `./testing` path loads no Shiki.

## Public surface

- `.` → `highlight`, `HighlightLang`.
- `./testing` → `assertAuthoredCodeSteps`, `AuthoredCodeStep`.

## Required environment

None.

## Slots vs invariants

**Invariants:**

- Shiki pinned at `1.24.0` (same pin the apps carried; bump here, nowhere else).
- Server/test-side only - never import from client components. No `server-only` marker on purpose: the apps' snippet tests exercise `highlight` under plain vitest, where that marker throws.
- Output is trusted build-time HTML injected via `dangerouslySetInnerHTML` in packages/ui's `CodeFrame` - never feed user input through `highlight`.
- Consumers style the output via `@dynamic-demos/ui/code-panel.css` (`.shiki-block` line numbers etc.), imported in the app's globals.

## Integration map

**Imports:** `shiki`.
**Imported by:** `apps/flow`, `apps/wallet`, `apps/earn`, `apps/trade` (every scenario app with a code panel).

## Examples

```ts
import { highlight } from "@dynamic-demos/code-highlight";

const html = await highlight(`import { createDynamicClient } from "@dynamic-labs-sdk/client";`, "typescript");
// -> pass as CodeStep.html into packages/ui's CodePanel
```

## Do / Don't

- Do: highlight server-side (RSC, route handlers) or in tests; ship the HTML to the client as `CodeStep.html`.
- Don't: add languages ad hoc per app - extend `HighlightLang` here so every panel stays consistent.
- Don't: import in client bundles; Shiki's grammars are heavy.

## Open questions / known gaps

- Theme is hardcoded `github-dark` to match the code-frame chrome (`#0d1117`); if the frame ever themes, thread the theme through here in the same PR.
