/**
 * Server-safe demo-editor metadata. Deliberately NOT a "use client" module:
 * Server Components (the prospect demo-instance page) read this, and a
 * non-component export from a "use client" module resolves to an opaque
 * client reference on the server - so this data cannot live in
 * `demo-editor-registry.tsx`. That module owns the client-only editor pieces
 * (KindFields, save actions); this owns the plain routing data the server
 * needs to decide how to render an instance.
 */

import type { DemoConfigKind } from "@/lib/services/types";

/**
 * Kinds edited outside the dashboard in their own console. The instance page
 * redirects to the returned URL instead of rendering an editor.
 */
export const EXTERNAL_CONSOLE_HREF: Partial<
  Record<DemoConfigKind, (configId: string) => string>
> = {
  checkout: (id) => `/checkouts/${id}`,
};

/**
 * Kinds edited in the dashboard via DemoConfigEditor - exactly the kinds with
 * a StoredDemoConfig loader on the instance page. Kinds in neither this set
 * nor EXTERNAL_CONSOLE_HREF (e.g. flow, whose theme comes from the prospect)
 * render the shared instance view: insights + share, no editor.
 */
export const DASHBOARD_EDITABLE_KINDS: ReadonlySet<DemoConfigKind> = new Set([
  "wallet",
  "earn",
  "remittance",
  "trade",
  "visa-direct",
]);
