"use client";

import { AuthLayout } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { useTradeConfig } from "@/contexts/trade-config-context";

export default function TradeAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { branding } = useTradeConfig();

  return (
    <AuthLayout logo={<AppLogo size={40} logoUrl={branding.logoUrl} />}>
      {children}
    </AuthLayout>
  );
}
