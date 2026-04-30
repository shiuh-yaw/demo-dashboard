---
phase: 1
slug: storefront
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js dev server + browser verification |
| **Config file** | `apps/shop/next.config.ts` |
| **Quick run command** | `pnpm --filter shop build` |
| **Full suite command** | `pnpm --filter shop build && pnpm --filter shop start` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter shop build`
- **After every plan wave:** Run `pnpm --filter shop build`
- **Before `/gsd:verify-work`:** Full build must succeed
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | SHELL-01 | build | `pnpm --filter shop build` | ❌ W0 | ⬜ pending |
| 01-02 | 01 | 1 | SHELL-02 | build | `pnpm --filter shop build` | ❌ W0 | ⬜ pending |
| 01-03 | 01 | 1 | SHELL-03 | build | `pnpm --filter shop build` | ❌ W0 | ⬜ pending |
| 01-04 | 01 | 1 | SHELL-04 | build | `pnpm --filter shop build` | ❌ W0 | ⬜ pending |
| 01-05 | 01 | 1 | SHELL-05 | manual | visual toggle check | ❌ W0 | ⬜ pending |
| 01-06 | 02 | 1 | CATL-01 | build | `pnpm --filter shop build` | ❌ W0 | ⬜ pending |
| 01-07 | 02 | 1 | CATL-02 | manual | visual grid check | ❌ W0 | ⬜ pending |
| 01-08 | 02 | 1 | CATL-03 | manual | visual button check | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/shop/` directory scaffolded with package.json, tsconfig.json, next.config.ts
- [ ] `pnpm install` succeeds with new workspace package

*Existing monorepo infrastructure covers build pipeline.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Product grid renders emoji/name/price | CATL-02 | Visual layout verification | Open localhost:4002, verify grid displays all products |
| Add to Cart button visible on each card | CATL-03 | Visual presence check | Verify button text "Add to Cart" on every product card |
| Dark/light mode toggle works | SHELL-05 | Theme visual verification | Click toggle, verify colors change throughout app |
| SDK initializes without double-init | SHELL-02 | Console log verification | Open browser console, verify no duplicate init warnings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
