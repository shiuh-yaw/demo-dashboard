"use client";

/**
 * Post-auth user menu - the trailing slot for both the unbranded merged
 * SiteHeader and the branded DashboardHeader. Wraps the shared
 * HeaderMenu shell (packages/ui) with remittance's identity content
 * (address + copy) and rows (Book a call, Clear theme when branded,
 * Sign out).
 */

import Link from "next/link";
import { Copy, Check, ExternalLink, LogOut, Paintbrush } from "lucide-react";
import {
  BookACallMenuRow,
  HeaderMenu,
  HeaderMenuRow,
  headerMenuRowClassName,
  useHeaderMenu,
} from "@dynamic-demos/ui";
import { truncateAddress } from "@dynamic-demos/utils";
import { useLogout } from "@/hooks/use-mutations";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useUserProfile } from "@/hooks/use-user-profile";
import { UserAvatar } from "@/components/ui/user-avatar";
import { APP_NAV_ITEMS, type NavItem } from "@/lib/nav-items";
import { getExplorerAddressUrl } from "@/lib/constants";

/**
 * Below md the header hides its nav (SiteHeader's center slot and
 * DashboardHeader's inline nav) - the pages get full-width rows here
 * instead, trade's mobile pattern.
 */
function MobileNavRows({ items }: { items: readonly NavItem[] }) {
  const { close } = useHeaderMenu();
  return (
    <div className="border-b border-(--brand-border)/50 md:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={close}
          className={headerMenuRowClassName("default")}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Identity header: address + copy and explorer icons (copy keeps the
 * menu open; the explorer opens a new tab and closes it).
 */
function AddressHeader({ walletAddress }: { walletAddress: string }) {
  const { copied, copy } = useCopyFeedback();
  const { close } = useHeaderMenu();
  return (
    <div className="flex w-full items-center gap-2 text-xs text-(--brand-muted)">
      {/* Longer form than the trigger's - the popover has the room and
          demos verify addresses by eye; copy/explorer carry the rest. */}
      <span className="min-w-24 font-mono">
        {truncateAddress(walletAddress, 10, 8)}
      </span>
      <button
        type="button"
        onClick={() => copy(walletAddress)}
        title={copied ? "Copied!" : "Copy address"}
        aria-label="Copy address"
        className="ml-auto p-1 rounded-md cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Copy className="w-3.5 h-3.5 shrink-0" />
        )}
      </button>
      <a
        href={getExplorerAddressUrl(walletAddress)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={close}
        title="View on explorer"
        aria-label="View on explorer"
        className="p-1 rounded-md cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>
    </div>
  );
}

export function UserMenu({
  walletAddress,
  branded,
  navItems = APP_NAV_ITEMS,
}: {
  walletAddress?: string;
  branded: boolean;
  /** Items for the mobile nav rows (admin passes its own). */
  navItems?: readonly NavItem[];
}) {
  const logoutMutation = useLogout();
  const { profile, isLoading } = useUserProfile();
  const displayName =
    profile?.displayName ||
    (walletAddress ? truncateAddress(walletAddress) : "Account");

  return (
    <HeaderMenu
      trigger={
        <UserAvatar
          displayName={displayName}
          email={profile?.email ?? ""}
          avatarUrl={profile?.avatarUrl ?? null}
          isLoading={isLoading}
          size="sm"
          hideTextOnMobile
        />
      }
      header={
        <div className="space-y-2.5">
          <UserAvatar
            displayName={displayName}
            email={profile?.email ?? ""}
            avatarUrl={profile?.avatarUrl ?? null}
            size="md"
          />
          {walletAddress && <AddressHeader walletAddress={walletAddress} />}
        </div>
      }
    >
      <MobileNavRows items={navItems} />
      <BookACallMenuRow />
      {branded && (
        <HeaderMenuRow
          icon={<Paintbrush className="w-4 h-4" />}
          // Full document navigation on purpose: the middleware must run
          // to delete the sticky remittance_config_id cookie.
          onClick={() => window.location.assign("/?theme=")}
        >
          Clear theme
        </HeaderMenuRow>
      )}
      <HeaderMenuRow
        icon={<LogOut className="w-4 h-4" />}
        onClick={() =>
          logoutMutation.mutateAsync().then(() => {
            window.location.href = "/";
          })
        }
        disabled={logoutMutation.isPending}
      >
        Sign out
      </HeaderMenuRow>
    </HeaderMenu>
  );
}
