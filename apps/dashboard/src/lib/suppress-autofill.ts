/**
 * Attributes that stop password managers (1Password, LastPass, etc.) from
 * injecting an autofill icon on non-credential text inputs. Spread onto plain
 * name / URL / search / color inputs; never needed on real credential fields
 * (there are none on the operator surfaces).
 */
export const suppressAutofill = {
  autoComplete: "off",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;
