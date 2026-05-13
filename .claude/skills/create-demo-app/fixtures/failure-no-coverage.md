---
prompt: "Build me a demo that sends USD to Antarctica."
expected_outcome: failure
expected_class: 1
must_contain:
  - "no provider"
  - "Antarctica"
must_not_change_files: true
---

# Failure class 1 — no coverage

No package in the registry has Antarctica in its regions. Skill should list supported destinations and stop without any file change.
