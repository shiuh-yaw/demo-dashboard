"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/droplet-client";
import { setTeamContext } from "@/lib/actions/scope";
import { TEAM_CTX_ALL, TEAM_CTX_PERSONAL } from "@/lib/prospect-scope";

export interface TeamSwitcherProps {
  teams: { id: string; name: string }[];
  isAdmin: boolean;
  activeCtx: string;
}

const pillClass =
  "flex h-7 max-w-[180px] items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground outline-none transition-[background-color,color] hover:bg-accent/50 hover:text-foreground cursor-pointer";

/**
 * Top-bar team context switcher (console-style pill + dropdown). Sets the
 * active TEAM context; the server re-derives what a user may load, so this is
 * convenience only. A user with no teams and no admin access sees a static
 * "Personal" pill (no dropdown).
 */
export function TeamSwitcher({ teams, isAdmin, activeCtx }: TeamSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Which item to spin while its own switch is in flight.
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  const label =
    activeCtx === TEAM_CTX_ALL
      ? "All teams"
      : activeCtx === TEAM_CTX_PERSONAL
        ? "Personal"
        : (teams.find((t) => t.id === activeCtx)?.name ?? "Personal");

  const hasChoices = teams.length > 0 || isAdmin;

  if (!hasChoices) {
    return (
      <span
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground"
        data-testid="team-switcher-static"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Personal</span>
      </span>
    );
  }

  function select(value: string) {
    if (value === activeCtx) {
      setOpen(false);
      return;
    }
    setPendingValue(value);
    startTransition(async () => {
      try {
        await setTeamContext(value);
        // A switch can move a page's underlying record (e.g. a prospect
        // detail) outside the newly-selected scope, so always land back on
        // the dashboard rather than re-rendering the current route.
        router.push("/dashboard");
        router.refresh();
      } finally {
        setPendingValue(null);
        setOpen(false);
      }
    });
  }

  const item = (value: string, text: string) => (
    <DropdownMenuItem
      key={value}
      disabled={pending}
      // Keep the menu open (preventDefault suppresses Radix's auto-close) so the
      // pending spinner stays visible until the switch settles.
      onSelect={(e) => {
        e.preventDefault();
        select(value);
      }}
    >
      <span className="truncate">{text}</span>
      {pending && pendingValue === value ? (
        <span role="status" className="ml-auto inline-flex">
          <Spinner size="sm" />
          <span className="sr-only">Switching to {text}</span>
        </span>
      ) : (
        value === activeCtx && (
          <Check className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        )
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={pillClass}
              data-testid="team-switcher"
              aria-label="Team context"
              disabled={pending}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch team context</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {item(TEAM_CTX_PERSONAL, "Personal")}
        {teams.length > 0 && <DropdownMenuSeparator />}
        {teams.map((t) => item(t.id, t.name))}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            {item(TEAM_CTX_ALL, "All teams")}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
