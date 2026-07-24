/**
 * Attributes that suppress password-manager autofill overlays (1Password,
 * LastPass, browser autofill) on non-credential operator inputs - names,
 * slugs, URLs, search/filter fields. Never spread onto genuine credential
 * fields (there are none in the operator forms).
 */
export const NO_AUTOFILL = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;
