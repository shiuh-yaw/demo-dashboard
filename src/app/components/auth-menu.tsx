"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronUp } from "lucide-react";
import { logout } from "@/lib/dynamicClient";
import { clearDashboardAuth } from "@/lib/auth/session";

interface AuthMenuProps {
  user: {
    sub: string;
    email?: string;
  } | null;
}

/**
 * Dashboard Auth Menu
 *
 * Sidebar bottom user menu - shows avatar only when collapsed, full info on hover.
 */
export default function AuthMenu({ user }: AuthMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

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

  const userEmail = user.email || "User";
  const displayName = userEmail.split("@")[0];
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer w-full px-2 group-hover:pl-3"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={userEmail}
      >
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-amber-900 text-xs font-semibold shrink-0">
          {userInitials}
        </div>
        <div className="flex-1 text-left min-w-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm font-medium text-slate-900 truncate">
            {displayName}
          </p>
          <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-slate-400 transition-all opacity-0 group-hover:opacity-100 ${
            isOpen ? "" : "rotate-180"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden z-50 w-48">
          {/* User info in popup */}
          <div className="px-3 py-2.5 border-b border-slate-100 group-hover:hidden">
            <p className="text-sm font-medium text-slate-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-slate-400 truncate">{userEmail}</p>
          </div>
          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
