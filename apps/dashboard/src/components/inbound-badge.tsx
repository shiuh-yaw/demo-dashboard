"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { countUnassignedProspects } from "@/lib/actions/prospects";
import { keys } from "@/lib/query/keys";

/**
 * Top-bar inbound signal: companies that arrived on their own, owned by
 * nobody. Links to the Overview's Inbound tab, where claiming happens.
 *
 * Renders nothing at zero - an always-present badge stops being a signal.
 */
export function InboundBadge() {
  const { data: count } = useQuery({
    queryKey: keys.inboundCount,
    queryFn: () => countUnassignedProspects(),
    staleTime: 60 * 1000,
  });

  if (!count) return null;

  return (
    <Link
      href="/dashboard?inbound=1"
      aria-label={`${count} inbound ${count === 1 ? "company" : "companies"} waiting to be assigned`}
      title="Inbound"
      className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
    >
      <Inbox className="h-4 w-4" />
      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-none text-primary-foreground">
        {count}
      </span>
    </Link>
  );
}
