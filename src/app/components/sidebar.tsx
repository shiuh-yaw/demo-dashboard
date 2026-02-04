"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FileText, Wallet } from "lucide-react";
import { DynamicIcon } from "@/components/dynamic-icon";
import { DynamicLogo } from "@/components/dynamic-logo";
import { CoinbaseIcon } from "@/components/coinbase-icon";
import AuthMenu from "./auth-menu";

const navGroups = [
  {
    items: [
      {
        href: "/",
        label: "Checkouts",
        icon: LayoutGrid,
        matchCheckouts: true,
      },
      {
        href: "/earns",
        label: "Earn",
        icon: Wallet,
      },
      {
        href: "/onramp",
        label: "Coinbase Onramp",
        icon: CoinbaseIcon,
      },
      {
        href: "/checkouts/documentation",
        label: "Checkout Docs",
        icon: FileText,
      },
    ],
  },
];

type SidebarProps = {
  user: {
    sub: string;
    email?: string;
  } | null;
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, matchCheckouts?: boolean) => {
    if (matchCheckouts) {
      return (
        pathname === "/" ||
        pathname.startsWith("/checkouts") ||
        pathname.startsWith("/widgets")
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="group bg-white border-r border-slate-100 flex flex-col fixed h-full w-16 hover:w-56 transition-all duration-200 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center">
        <Link href="/">
          <DynamicIcon width={28} height={28} className="group-hover:hidden" />
          <DynamicLogo
            width={110}
            height={25}
            className="hidden group-hover:block"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-2">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 && (
              <div className="border-t border-slate-100 my-2" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href, item.matchCheckouts);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? "text-[#4779FF]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                    title={item.label}
                  >
                    <item.icon
                      className={`w-[20px] h-[20px] shrink-0 ${
                        active ? "text-[#4779FF]" : "text-slate-400"
                      }`}
                      strokeWidth={active ? 2 : 1.5}
                    />
                    <span className="text-[13px] font-normal whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Menu - Bottom */}
      {user && (
        <div className="px-2 py-2 border-t border-slate-100">
          <AuthMenu user={user} />
        </div>
      )}
    </aside>
  );
}
