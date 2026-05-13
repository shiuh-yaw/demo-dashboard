---
prompt: "Build me a US→US ACH onramp demo using Stripe."
expected_outcome: failure
expected_class: 5
must_contain:
  - "Stripe"
  - "full packages/"
must_be_question_count: 1
must_not_change_files: true
---

# Failure class 5 — missing piece

No `packages/stripe/` exists. Skill should prompt the user with the 3-option choice and recommend creating a full `packages/stripe/` wrapper (option 1). Option 2 is the escape hatch (direct-in-app) for genuine one-offs; option 3 aborts.
