"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { logout } from "@/lib/dynamicClient";
import { clearDashboardAuth } from "@/lib/auth/session";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/droplet-client";

interface AuthMenuProps {
  user: {
    sub: string;
    email?: string;
  } | null;
}

/**
 * Account menu for the top bar. Droplet DropdownMenu + Avatar; uses Google
 * profile picture and name when available, falls back to JWT data.
 */
export default function AuthMenu({ user }: AuthMenuProps) {
  const router = useRouter();
  const { profile } = useUserProfile();

  async function handleLogout() {
    try {
      await logout();
      await clearDashboardAuth();
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      router.refresh();
    }
  }

  if (!user) return null;

  const displayName =
    profile?.displayName || user.email?.split("@")[0] || "User";
  const userEmail = profile?.email || user.email || "User";
  const avatarUrl = profile?.avatarUrl;
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          title={userEmail}
          className="group flex items-center gap-2 rounded-md p-1 pr-2 text-left outline-none"
        >
          <Avatar className="h-7 w-7 opacity-100 transition-opacity group-hover:opacity-70">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-[11px]">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-foreground opacity-100 transition-opacity group-hover:opacity-70 sm:block">
            {displayName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {userEmail}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
