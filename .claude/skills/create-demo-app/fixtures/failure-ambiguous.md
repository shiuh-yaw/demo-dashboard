---
prompt: "Build me a demo that sends USD to Brazil."
expected_outcome: failure
expected_class: 3
must_contain:
  - "multiple"
  - "PIX"
must_be_question_count: 1
must_not_change_files: true
---

# Failure class 3 — ambiguous corridor

Multiple providers (alfredPay, BlindPay, Iron) cover BR/BRL/PIX. Skill should ask ONE disambiguation question with options and a recommendation.
