/**
 * Header row for a prospect demo instance: name + mobile back control on the
 * left, Preview + Share on the right. Shared by the editable-kind editor
 * (DemoConfigEditor's "prospect-instance" variant) and the editor-less kinds
 * (e.g. flow) that render insights + share without a config editor - so the
 * chrome stays identical across every demo kind.
 */

import Link from "next/link";
import { ChevronLeft, Eye } from "lucide-react";
import { Button } from "@/components/droplet-client";
import {
  ShareLinkButton,
  type ShareLinkBoundProspect,
} from "@/components/shared/share-link-button";

export function DemoInstanceHeader({
  name,
  backHref,
  demoUrl,
  demoConfigId,
  instanceShare,
}: {
  name: string;
  backHref: string;
  demoUrl: string | null;
  demoConfigId: string;
  instanceShare?: ShareLinkBoundProspect;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {/* Back control is mobile-only; on desktop the breadcrumb owns up-nav. */}
        <Link
          href={backHref}
          aria-label="Back to demos"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="min-w-0 truncate text-base font-semibold text-foreground">
          {name}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {demoUrl && (
          <Button asChild variant="secondary" size="sm">
            <a href={demoUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview
            </a>
          </Button>
        )}
        {instanceShare && (
          <ShareLinkButton
            trigger="button"
            variant="primary"
            label="Share"
            demoConfigId={demoConfigId}
            boundProspect={instanceShare}
          />
        )}
      </div>
    </div>
  );
}
