/**
 * Cross-demo directory - the entries behind the SiteHeader's "Demos"
 * hover grid, so any scenario page can jump straight to another demo.
 *
 * DERIVED from `DEMO_CATALOG`, never hand-written: this used to be a manual
 * mirror of the dashboard catalog and drifted from it (four taglines diverged
 * and two demos went missing). To change a name, tagline or URL, edit
 * `demo-catalog.ts` - the landing cards and this grid then move together.
 * Apps can still override the rendered set via SiteHeader's `demos` prop.
 */

import { DEMO_CATALOG, type DemoCatalogEntry } from "./demo-catalog";

export interface DemoDirectoryEntry {
  name: string;
  tagline: string;
  href: string;
}

/**
 * A demo reaches the nav grid only if it is public, actually deployed, and not
 * flagged as banner-only (`showInNav: false`).
 */
function isNavigable(
  demo: DemoCatalogEntry,
): demo is DemoCatalogEntry & { url: string } {
  return (
    demo.showOnLanding &&
    typeof demo.url === "string" &&
    demo.showInNav !== false
  );
}

export const DEMO_DIRECTORY: DemoDirectoryEntry[] = DEMO_CATALOG.filter(
  isNavigable,
).map((demo) => ({
  name: demo.name,
  tagline: demo.tagline,
  href: demo.url,
}));
