---
prompt: "Build me a demo that uses BlindPay to offramp USD to Germany via SEPA."
expected_outcome: failure
expected_class: 2
must_contain:
  - "BlindPay"
  - "Germany"
  - "Iron"
must_not_change_files: true
---

# Failure class 2 — named provider wrong region

BlindPay's regions in the registry are limited to BR / US / MX / CO / AR — they do not include DE (Germany / SEPA). The skill should call this out and suggest the alternative offramp package (Iron) that covers Germany / SEPA.
