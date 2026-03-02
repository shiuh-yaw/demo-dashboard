/**
 * Earn Config Layout
 *
 * Loads the Earn configuration by ID and provides it to all child components.
 * This layout wraps the dashboard with custom theme and branding.
 */

import { notFound } from "next/navigation";
import { DEFAULT_EARN_CONFIG, getEarnConfig } from "@/lib/earn-config";
import { EarnConfigProvider } from "@/contexts/earn-config-context";
import { EarnLayoutClient } from "./layout-client";

interface EarnConfigLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storedConfig = await getEarnConfig(id);
  if (!storedConfig) return { title: "Config Not Found" };

  const title = storedConfig.name || "Earn";
  return {
    title: `${title} - Earn Demo`,
    description: storedConfig.description || `${title} Dashboard Demo`,
  };
}

export default async function EarnConfigLayout({
  children,
  params,
}: EarnConfigLayoutProps) {
  const { id } = await params;

  // Fetch the config from the dashboard API
  const storedConfig = await getEarnConfig(id);
  if (!storedConfig) notFound();

  return (
    <EarnConfigProvider
      config={{
        ...storedConfig.config,
        branding: storedConfig.config.branding,
        // DO NOT ALLOW THEME TO BE OVERRIDDEN
        theme: DEFAULT_EARN_CONFIG.theme,
      }}
      configId={id}
    >
      <EarnLayoutClient>{children}</EarnLayoutClient>
    </EarnConfigProvider>
  );
}
