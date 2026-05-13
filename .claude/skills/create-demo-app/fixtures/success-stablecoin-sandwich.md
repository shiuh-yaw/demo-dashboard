---
prompt: "Build a US→BR stablecoin sandwich demo: onramp via Coinbase, bridge via LI.FI, offramp via Iron. Brand: Acme. Name: acme-sandwich."
expected_outcome: success
expected_branch_pattern: "^skill/acme-sandwich-\\d+$"
expected_files_created:
  - "apps/acme-sandwich/"
  - "apps/dashboard/src/app/acme-sandwich/"
must_not_change_files: false
---

# Success path — stablecoin sandwich

Canonical happy-path scenario. The user provides a fully-specified intent prompt with named providers covering the corridor. The skill should match cleanly with zero clarifying questions and produce a working PR.
