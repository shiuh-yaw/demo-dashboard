/**
 * Auth Layout
 *
 * Layout for authentication pages (login, callback, etc.) Server
 * component so it can read the `x-earn-config-id` middleware header,
 * fetch the brand config, and render the brand's logo above the auth
 * card. Falls back to the Dynamic wordmark when no config is resolved.
 *
 * Theme tokens (`--brand-*`) are injected at the document level by
 * `<ThemeStyleTag>` in the root layout, so the card's surface +
 * borders follow the brand automatically.
 */

import { headers } from "next/headers";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { AppLogo } from "@/components/icons";
import { DEFAULT_EARN_CONFIG } from "@/lib/earn-config";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-earn-config-id");
  const config = await fetchDemoConfig({
    demoType: "earn",
    id: configId,
    fallback: DEFAULT_EARN_CONFIG,
  });
  const branding = config.branding;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-earn-light p-6">
      <AppLogo
        className="h-12 w-auto"
        brand={branding?.logo}
        logoUrl={branding?.logoUrl}
      />
      <div className="bg-white border border-earn-border rounded-lg p-8 max-w-md w-full shadow-lg">
        {children}
      </div>
    </div>
  );
}
