"use client";

/**
 * Segment error boundary for the legacy checkouts surface. Keeps a runtime
 * exception here from blanking the whole operator shell with the global error
 * page; renders a stable, themed fallback with a retry instead.
 */

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/droplet-client";

export default function CheckoutsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Checkouts surface error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-divider bg-card p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      <h1 className="mt-3 text-sm font-semibold text-foreground">
        Checkouts is temporarily unavailable
      </h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This legacy surface hit an error while loading. Try again, or continue
        from the prospect hub.
      </p>
      <Button className="mt-4" size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
