"use client";

import { LogOut, Paintbrush, RotateCcw } from "lucide-react";
import {
  BookACallMenuRow,
  HeaderMenu,
  HeaderMenuRow,
} from "@dynamic-demos/ui";
import { logout } from "@/lib/dynamic";
import { clearDashboardAuth } from "@/lib/auth/session";
import { useEarnConfig } from "@/contexts/earn-config-context";
import { usePayoutDemoOptional } from "@/contexts/payout-demo-context";
import { useBlindPayKYC } from "@/hooks/use-blindpay-kyc";
import { useUserProfile } from "@/hooks/use-user-profile";
import { UserAvatar } from "@/components/user-avatar";
import type { DynamicJwtPayload } from "@dynamic-demos/dynamic";

interface UserMenuProps {
  user: DynamicJwtPayload | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const { configId } = useEarnConfig();
  const payoutDemo = usePayoutDemoOptional();
  const { reset: resetKYC, isComplete: isKYCComplete } = useBlindPayKYC();
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  const handleLogout = async () => {
    // The scenario front door at "/" is the login surface; loggedOut
    // prevents the auth-check blip and is stripped from the URL by
    // <LoginCleanup> after load. (Legacy /e/[id] paths 307 to /?theme=
    // via next.config, so no path-aware branching needed.)
    const loginUrl = "/?loggedOut=true";

    try {
      await logout();
      await clearDashboardAuth();
      window.location.href = loginUrl;
    } catch {
      try {
        await clearDashboardAuth();
      } catch {
        // Silently fail - user will be redirected anyway
      }
      window.location.href = loginUrl;
    }
  };

  // Use profile from Dynamic if available, fallback to JWT email
  const displayName =
    profile?.displayName || user?.email?.split("@")[0] || "User";
  const userEmail = profile?.email || user?.email || "";
  const avatarUrl = profile?.avatarUrl ?? null;

  return (
    <HeaderMenu
      menuClassName="w-64"
      trigger={
        <UserAvatar
          displayName={displayName}
          email={userEmail}
          avatarUrl={avatarUrl}
          isLoading={isProfileLoading}
          size="sm"
          hideTextOnMobile
        />
      }
      header={
        <UserAvatar
          displayName={displayName}
          email={userEmail}
          avatarUrl={avatarUrl}
          size="md"
        />
      }
    >
      <BookACallMenuRow />
      {payoutDemo && (
        <HeaderMenuRow
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={() => payoutDemo.resetPayoutDemo()}
          title="Reset payout demo state (random values)"
        >
          Reset payout demo
        </HeaderMenuRow>
      )}
      <HeaderMenuRow
        icon={<RotateCcw className="w-4 h-4" />}
        onClick={resetKYC}
        title={
          isKYCComplete
            ? "Reset BlindPay KYC demo state"
            : "Clear any partial bank setup data"
        }
      >
        {isKYCComplete ? "Reset bank setup" : "Reset bank data"}
      </HeaderMenuRow>
      {configId && (
        <HeaderMenuRow
          icon={<Paintbrush className="w-4 h-4" />}
          // Full document navigation on purpose: the middleware must run
          // to delete the sticky earn_config_id cookie (empty ?theme=
          // clears it, then bounces authed users back to /earn unbranded).
          onClick={() => window.location.assign("/?theme=")}
          title="Remove the custom brand theme and return to the default look"
        >
          Clear theme
        </HeaderMenuRow>
      )}
      <HeaderMenuRow
        icon={<LogOut className="w-4 h-4" />}
        onClick={handleLogout}
        className="border-t border-(--brand-border)/60"
      >
        Logout
      </HeaderMenuRow>
    </HeaderMenu>
  );
}
