"use client";

import { AuthLayout } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";

export default function TradeAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout logo={<AppLogo size={40} />}>{children}</AuthLayout>;
}
