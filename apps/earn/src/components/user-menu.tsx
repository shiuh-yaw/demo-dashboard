"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, RotateCcw } from "lucide-react";
import { logout } from "@/lib/dynamic";
import { clearDashboardAuth } from "@/lib/auth/session";
import { usePayoutDemoOptional } from "@/contexts/payout-demo-context";
import { useBlindPayKYC } from "@/hooks/use-blindpay-kyc";
import { useUserProfile } from "@/hooks/use-user-profile";
import { UserAvatar } from "@/components/user-avatar";
import type { DynamicJwtPayload } from "@dynamic-demos/dynamic";

interface UserMenuProps {
  user: DynamicJwtPayload | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const payoutDemo = usePayoutDemoOptional();
  const { reset: resetKYC, isComplete: isKYCComplete } = useBlindPayKYC();
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    // Determine the correct login redirect based on current route
    // If on /e/[id]/* route, redirect to /e/[id]/login, otherwise /login
    const pathname = window.location.pathname;
    const configMatch = pathname.match(/^\/e\/([^/]+)/);
    const loginUrl = configMatch
      ? `/e/${configMatch[1]}/login?loggedOut=true`
      : "/login?loggedOut=true";

    try {
      // Logout from Dynamic SDK first (client-side)
      await logout();

      // Clear auth cookie (server-side)
      await clearDashboardAuth();

      // Redirect to login with loggedOut parameter to prevent auth check blip
      // This tells the middleware and login page to skip auth checks
      window.location.href = loginUrl;
    } catch (error) {
      // Still try to clear cookie even if logout fails
      try {
        await clearDashboardAuth();
      } catch (clearError) {
        // Silently fail - user will be redirected anyway
      }
      // Force redirect to login with loggedOut parameter
      window.location.href = loginUrl;
    }
  };

  // Use profile from Dynamic if available, fallback to JWT email
  const displayName =
    profile?.displayName || user?.email?.split("@")[0] || "User";
  const userEmail = profile?.email || user?.email || "";
  const avatarUrl = profile?.avatarUrl ?? null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-auto py-1.5 px-2 rounded-lg bg-white border border-earn-border hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
      >
        <UserAvatar
          displayName={displayName}
          email={userEmail}
          avatarUrl={avatarUrl}
          isLoading={isProfileLoading}
          size="sm"
        />
        <ChevronDown className="w-4 h-4 text-earn-text-secondary shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white shadow-lg border border-earn-border rounded-lg py-1 z-50">
          <div className="px-4 py-3 border-b border-earn-border">
            <UserAvatar
              displayName={displayName}
              email={userEmail}
              avatarUrl={avatarUrl}
              size="md"
            />
          </div>
          {payoutDemo && (
            <button
              onClick={() => {
                payoutDemo.resetPayoutDemo();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-xs text-earn-text-secondary hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
              title="Reset payout demo state (random values)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset payout demo</span>
            </button>
          )}
          <button
            onClick={() => {
              resetKYC();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-xs text-earn-text-secondary hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
            title={
              isKYCComplete
                ? "Reset BlindPay KYC demo state"
                : "Clear any partial bank setup data"
            }
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {isKYCComplete ? "Reset bank setup" : "Reset bank data"}
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-left text-sm text-earn-text-primary hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer border-t border-earn-border/60"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
