"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { cn } from "@dynamic-demos/utils";
import {
  DashboardIcon,
  ContentIcon,
  AnalyticsIcon,
  CommentsIcon,
  SubtitlesIcon,
  CopyrightIcon,
  EarnIcon,
  CustomizationIcon,
  AudioLibraryIcon,
  SettingsIcon,
  HelpCircleIcon,
} from "./icons";

const baseNavigation = [
  { name: "Dashboard", href: "/", icon: DashboardIcon },
  { name: "Content", href: "/content", icon: ContentIcon },
  { name: "Analytics", href: "/analytics", icon: AnalyticsIcon },
  { name: "Comments", href: "/comments", icon: CommentsIcon },
  { name: "Subtitles", href: "/subtitles", icon: SubtitlesIcon },
  { name: "Copyright", href: "/copyright", icon: CopyrightIcon },
  { name: "Earn", href: "/earn", icon: EarnIcon },
  { name: "Customization", href: "/customization", icon: CustomizationIcon },
  { name: "Audio library", href: "/audio", icon: AudioLibraryIcon },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

interface SidebarProps {
  className?: string;
  /** Config ID for /e/[id] routes - prefixes all navigation links */
  configId?: string;
}

export function Sidebar({ className, configId }: SidebarProps) {
  const pathname = usePathname();

  // If configId is provided, prefix all hrefs with /e/[configId]
  const basePrefix = configId ? `/e/${configId}` : "";
  const navigation = baseNavigation.map((item) => ({
    ...item,
    href: `${basePrefix}${item.href}`,
  }));

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-16 bg-white border-r border-earn-border flex-col items-center py-2 z-30",
        className
      )}
    >
      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 w-full">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center h-12 transition-colors",
                isActive
                  ? "bg-[#F5F5F5] roundxed-md text-earn-text-primary mx-2"
                  : "text-earn-text-secondary w-full"
              )}
              title={item.name}
            >
              <div
                style={{
                  fill: isActive ? "var(--color-earn-text-primary)" : "none",
                }}
              >
                <item.icon className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Help/Feedback */}
      <div className="mt-auto w-full">
        <button
          className="flex flex-col items-center justify-center w-full h-12 text-earn-text-secondary transition-colors"
          title="Send feedback"
        >
          <HelpCircleIcon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
