"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header style={{ backgroundColor: "#222222" }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#F1641E", fontFamily: "Georgia, serif" }}
            >
              etsy
            </span>
            <span className="text-sm text-gray-400 font-medium">
              Finance Operations
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            <Link
              href="/disbursements"
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                color: isActive("/disbursements") ? "#F1641E" : "#9ca3af",
                backgroundColor: isActive("/disbursements")
                  ? "rgba(241,100,30,0.1)"
                  : "transparent",
              }}
            >
              Disbursements
            </Link>
            <Link
              href="/transactions"
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                color: isActive("/transactions") ? "#F1641E" : "#9ca3af",
                backgroundColor: isActive("/transactions")
                  ? "rgba(241,100,30,0.1)"
                  : "transparent",
              }}
            >
              Transactions
            </Link>
          </nav>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs font-medium text-white">
              MR
            </div>
            <span className="text-sm text-gray-400">M. Rodriguez · Finance</span>
          </div>
        </div>
      </div>
    </header>
  );
}
