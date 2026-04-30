"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { NetworkSwitcher } from "./network-switcher";

const navLinks = [
  { label: "Apps", href: "/" },
  { label: "Tax & Banking", href: "/payment-methods" },
  { label: "Payments", href: "/reports" },
  { label: "Users", href: "/apps" },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Network state is owned by `ActiveNetworkProvider` (mounted in
  // `app/providers.tsx`). The wallet card and this pill consume the
  // exact same context value so they can never drift.
  const { networks, active, switching, switchTo } = useActiveNetwork();

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        height: "52px",
        background: "rgba(29,29,31,0.92)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
      }}
    >
      <div
        className="h-full flex items-center"
        style={{
          maxWidth: "var(--max-width-content)",
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        {/* Left: brand. `flex-1` reserves a side region of equal weight to
            the right one so the center nav stays geometrically centered
            even as the network pill on the right changes width. */}
        <div className="flex-1 flex items-center gap-2.5">
          <span className="text-[17px] font-semibold text-(--proceeds-grey) tracking-tight">
            Connect
          </span>
        </div>

        {/* Center: nav links — anchored to the middle of the bar. */}
        <div className="flex items-center h-full gap-1 shrink-0">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex items-center rounded-full px-3.5 py-1.5 text-[13px] no-underline transition-colors whitespace-nowrap"
                style={{
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                  background: isActive
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: network switcher + sign out. `flex-1` + `justify-end`
            mirrors the left side so the center nav doesn't shift when the
            network pill resizes. */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {active && (
            <NetworkSwitcher
              variant="header"
              networks={networks}
              active={active}
              switching={switching}
              onSelect={switchTo}
            />
          )}
          <button
            onClick={logout}
            className="text-[13px] text-white/45 bg-transparent border-none cursor-pointer rounded-full px-3 py-1.5 transition-colors hover:text-white/80"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
