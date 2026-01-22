"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
      <div className="bg-white rounded-xl border border-[#e1e4ea] p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-[#dc2626]" />
        </div>
        <h2 className="text-lg font-semibold text-[#0e121b] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[#525866] mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={reset} className="gap-2 px-4 text-sm">
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
