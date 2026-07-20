/**
 * Public site footer — the canonical implementation now lives in
 * @dynamic-demos/ui (shared with demo scenario pages). The heart's
 * sign-in link is dashboard-specific (relative route, post GTM-01
 * Brand→Prospect rename), threaded here.
 */
import { SiteFooter as SharedSiteFooter } from "@dynamic-demos/ui";

export function SiteFooter() {
  return <SharedSiteFooter signInHref="/prospects" />;
}
