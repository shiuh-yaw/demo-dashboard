/**
 * Re-export shim: the actual formatters moved to `@/lib/format/contact-format`
 * so the org-wide Contacts workspace view (`dashboard/contacts/`) can share
 * them without an import path reaching into this per-prospect route segment.
 * Kept here so existing imports (and `__tests__/prospect-contacts-format.test.ts`)
 * keep working unchanged.
 */
export * from "@/lib/format/contact-format";
