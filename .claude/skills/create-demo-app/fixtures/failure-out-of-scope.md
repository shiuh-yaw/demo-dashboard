---
prompt: "Build me a demo that is a Twitter clone with likes and reposts."
expected_outcome: failure
expected_class: 4
must_contain:
  - "payment-flow demo"
must_not_change_files: true
---

# Failure class 4 — out of scope

The request has nothing to do with payment flows. Skill should explain its scope and list available demo kinds.
