"use client";

/**
 * Header action "Customize for a prospect": a self-contained trigger button +
 * modal. The modal holds a searchable prospect picker (visibility-scoped via
 * listProspectOptions) and a build action that brands this demo kind for the
 * chosen prospect, reusing the prospect-hub creation path through
 * buildDemoForProspect; when the prospect already runs this kind it reuses the
 * existing config instead of duplicating. On success the operator is routed
 * straight to the demo instance (theme/metrics view), not the prospect hub.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sliders } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/droplet-client";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import type { ProspectOption } from "@/lib/actions/prospects";
import { buildDemoForProspect } from "./actions";

export interface ConfigureForProspectProps {
  kind: string;
  demoName: string;
  /** Server-fetched picker options - see `ProspectPickerProps.initialData`. */
  initialProspectOptions?: ProspectOption[];
}

export function ConfigureForProspect({
  kind,
  demoName,
  initialProspectOptions,
}: ConfigureForProspectProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setProspectId(null);
      setError(null);
    }
  }

  async function handleBuild() {
    if (!prospectId) return;
    setBuilding(true);
    setError(null);
    try {
      const res = await buildDemoForProspect(kind, prospectId);
      if (res.success) {
        setOpen(false);
        router.push(`/dashboard/prospects/${res.prospectId}/demos/${res.configId}`);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Failed to build demo");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="shrink-0">
          <Sliders className="mr-1.5 h-4 w-4" />
          Customize for a prospect
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="min-w-0">
          <DialogTitle className="pr-8 leading-snug">
            Customize {demoName} for a prospect
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="min-w-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick a prospect to brand {demoName} for them, then open the build
            to share it.
          </p>
          <ProspectPicker
            className="w-full min-w-0"
            value={prospectId}
            onChange={setProspectId}
            onSelectOption={() => setError(null)}
            initialData={initialProspectOptions}
            disabled={building}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={building}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleBuild} disabled={!prospectId || building}>
            {building ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Build Demo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
