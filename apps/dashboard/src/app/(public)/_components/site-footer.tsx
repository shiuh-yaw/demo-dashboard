/**
 * Public site footer — the canonical implementation now lives in
 * @dynamic-demos/ui (shared with demo scenario pages). The heart's
 * /brands sign-in link is dashboard-specific, threaded here.
 */
import { SiteFooter as SharedSiteFooter } from "@dynamic-demos/ui";

export function SiteFooter() {
  return <SharedSiteFooter signInHref="/brands" />;
}
