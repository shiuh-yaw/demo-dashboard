/**
 * Canonical URL of the demos catalog / operator landing. The shared chrome
 * (SiteHeader "Demos" crumb, SiteFooter sign-in) links back here by default,
 * so demo apps don't hardcode it. The dashboard IS the catalog and overrides
 * with a same-site "/".
 *
 * Single source of truth for the catalog domain - moving it is a one-line
 * change here. (Individual demos stay on their own *.dynamic.dev subdomains.)
 */
export const DEMOS_CATALOG_URL = "https://demo.dynamic.xyz";
