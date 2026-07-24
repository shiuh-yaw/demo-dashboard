"use client";

/**
 * Top-bar "Getting started" checklist (Phase 7 IA relayout). Replaces the
 * dashboard-home card (Phase 3): same 4-item checklist, same completion
 * logic (`lib/onboarding-checklist.ts`), same dismiss cookie
 * (`dismissChecklist()`), but reachable from every operator page via a
 * small icon button in the top bar instead of a card above the prospect
 * list on the home route only.
 *
 * The top bar renders on every page, so the checklist's completion state is
 * never computed during a page's server render (that would mean every route
 * paying for the profile/prospect/demo/share-link lookups). Instead
 * `GettingStartedPopover` fetches it itself, client-side, via
 * `getGettingStartedState()` (`lib/actions/onboarding.ts`) through TanStack
 * Query - one round trip on mount, cached across client-side navigations by
 * the shared query client (`lib/query/get-query-client.ts`).
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ListChecks, Loader2, X } from "lucide-react";

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/droplet-client";
import { NewProspectDialog } from "@/components/shared/new-prospect-dialog";
import {
  dismissChecklist,
  getGettingStartedState,
  type GettingStartedState,
} from "@/lib/actions/onboarding";
import { keys } from "@/lib/query/keys";
import {
  computeChecklistCompletion,
  isChecklistComplete,
  type ChecklistItemId,
} from "@/lib/onboarding-checklist";

interface ChecklistItemView {
  id: ChecklistItemId;
  label: string;
  description: string;
  href: string;
  complete: boolean;
}

function buildItems(state: GettingStartedState): ChecklistItemView[] {
  const completion = computeChecklistCompletion(state);
  return [
    {
      id: "profile",
      label: "Complete your profile",
      description:
        "Add your name and meeting link so prospects can book time with you.",
      href: "/dashboard/profile",
      complete: completion.profile,
    },
    {
      id: "prospect",
      label: "Create your first prospect",
      description: "Add the account you're demoing to.",
      href: "/dashboard/prospects",
      complete: completion.prospect,
    },
    {
      id: "demo",
      label: "Add your first demo",
      description: "Spin up a branded demo for a prospect.",
      href: state.demoHref,
      complete: completion.demo,
    },
    {
      id: "share",
      label: "Share your first demo",
      description: "Mint a trackable link and send it to a prospect.",
      href: state.demoHref,
      complete: completion.share,
    },
  ];
}

interface GettingStartedItemsProps {
  items: ChecklistItemView[];
  /** Gates whether the "prospect" item opens `NewProspectDialog` directly. */
  canCreateProspect: boolean;
  onCreateProspect: () => void;
}

/** Shared item-row markup - the one place the checklist's rows are drawn. */
function GettingStartedItems({
  items,
  canCreateProspect,
  onCreateProspect,
}: GettingStartedItemsProps) {
  return (
    <>
      {items.map((item) => {
        const isProspectItem = item.id === "prospect";
        const opensDialog =
          isProspectItem && !item.complete && canCreateProspect;

        const row = (
          <div className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={
                  item.complete
                    ? "text-sm font-medium text-muted-foreground line-through"
                    : "text-sm font-medium text-foreground"
                }
              >
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        );

        if (item.complete) {
          return <div key={item.id}>{row}</div>;
        }

        if (opensDialog) {
          return (
            <button
              key={item.id}
              type="button"
              className="block w-full text-left"
              onClick={onCreateProspect}
            >
              {row}
            </button>
          );
        }

        return (
          <Link key={item.id} href={item.href} className="block">
            {row}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Icon button + popover for the top bar. Renders nothing until the state
 * query resolves, and nothing once it resolves to "complete" or
 * "dismissed" - same auto-hide rule the dashboard-home card used.
 */
export function GettingStartedPopover() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [dismissing, startDismiss] = useTransition();
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: keys.onboardingChecklist,
    queryFn: () => getGettingStartedState(),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const complete = isChecklistComplete(computeChecklistCompletion(data));
  const dismissed = locallyDismissed || data.dismissed;
  if (complete || dismissed) return null;

  const items = buildItems(data);
  const doneCount = items.filter((item) => item.complete).length;
  const remaining = items.length - doneCount;

  function handleDismiss() {
    startDismiss(async () => {
      await dismissChecklist();
      setLocallyDismissed(true);
      setOpen(false);
      void queryClient.invalidateQueries({
        queryKey: keys.onboardingChecklist,
      });
    });
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Getting started, ${remaining} step${remaining === 1 ? "" : "s"} left`}
            title="Getting started"
            className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <ListChecks className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-none text-primary-foreground">
              {remaining}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-start justify-between gap-4 p-4 pb-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Getting started
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {doneCount} of {items.length} done - share your first demo to
                see it in action.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={dismissing}
              onClick={handleDismiss}
              aria-label="Dismiss getting started checklist"
            >
              {dismissing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex flex-col gap-1 p-2 pt-0">
            <GettingStartedItems
              items={items}
              canCreateProspect={data.canCreateProspect}
              onCreateProspect={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {data.canCreateProspect && (
        <NewProspectDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  );
}
