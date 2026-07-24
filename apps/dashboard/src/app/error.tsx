"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { BrandGateLayout } from "@/components/brand-gate-layout";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/droplet-client";

/**
 * Root error boundary. Renders shell-less (replaces the operator shell or
 * public chrome for whichever segment threw) so it shares `BrandGateLayout`
 * with the auth/denied/welcome gates instead of hardcoding a light-only card.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <BrandGateLayout>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.message ||
              "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} className="w-full gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </BrandGateLayout>
  );
}
