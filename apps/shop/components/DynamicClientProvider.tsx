"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, type FC, type ReactNode } from "react";
import {
  initializeDynamicClient,
  waitForDynamicClientInitialized,
} from "@/lib/dynamic-client";
import { Spinner } from "@dynamic-demos/ui";

export const DynamicClientProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeDynamicClient();
  }, []);

  const { data: isReady } = useQuery({
    queryFn: async () => {
      await waitForDynamicClientInitialized();
      return true;
    },
    queryKey: ["clientInitialized"],
    staleTime: Infinity,
  });

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};
