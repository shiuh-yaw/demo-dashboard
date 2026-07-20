/**
 * buildDemoMetadata - shared tab title/description for demo apps.
 *
 * Branded configs (?theme=) title the tab as the prospect's app
 * ("SpaceX - Trade"); unbranded falls back to "<Demo> - Dynamic Demos".
 * Returns a plain object assignable to Next's `Metadata` - the package
 * stays framework-neutral.
 */

export interface DemoMetadataOpts {
  /** Demo display name, e.g. "Trade" - matches the SiteHeader chip. */
  demoName: string;
  /** Meta description - carries the demo's marketing narrative. */
  description: string;
  /** Brand app name from a branded config; omit when unbranded. */
  appName?: string | null;
}

export function buildDemoMetadata({
  demoName,
  description,
  appName,
}: DemoMetadataOpts): { title: string; description: string } {
  return {
    title: appName ? `${appName} - ${demoName}` : `${demoName} - Dynamic Demos`,
    description,
  };
}
