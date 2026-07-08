/**
 * Checkout Settings Page (Server Component)
 *
 * Shows the configuration editor for a checkout.
 * Note: Layout already validates checkout exists and handles auth.
 */

import { getCheckoutConfig } from "@/lib/actions/checkouts";
import { SettingsClient } from "./settings-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckoutSettingsPage({ params }: PageProps) {
  const { id } = await params;

  // Layout already validates checkout exists, but we need the config for the editor
  // TODO: Consider using React cache() to deduplicate this fetch with layout
  const checkout = await getCheckoutConfig(id);

  return <SettingsClient id={id} checkout={checkout} />;
}
