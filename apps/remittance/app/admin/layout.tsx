import type { Metadata } from "next";
import { AppChrome } from "@/components/layouts/app-chrome";
import { ADMIN_NAV_ITEMS } from "@/lib/nav-items";
import { getServerUserData } from "@/lib/auth/server-auth";

import "../globals.css";

export const metadata: Metadata = {
  title: "Remittance Admin - Fireblocks + Dynamic",
  description: "Admin dashboard for managing vaults, users, and transfers",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = await getServerUserData();
  const walletAddress = userData?.walletAddress ?? undefined;

  return (
    <AppChrome
      walletAddress={walletAddress}
      navItems={ADMIN_NAV_ITEMS}
      brandLabel="Remittance Admin"
      brandHref="/admin"
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </AppChrome>
  );
}
