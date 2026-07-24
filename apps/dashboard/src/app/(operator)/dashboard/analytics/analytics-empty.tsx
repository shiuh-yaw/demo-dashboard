"use client";

import Link from "next/link";
import { LineChart } from "lucide-react";
import { Button, EmptyState } from "@/components/droplet-client";

/**
 * Client boundary for the analytics empty state. Droplet EmptyState takes a
 * component-type `icon`, which cannot cross the server/client boundary as a
 * prop, so the icon is owned here.
 */
export function AnalyticsEmpty() {
  return (
    <EmptyState
      icon={LineChart}
      title="Wire a demo to see engagement"
      description="Once a share link goes out and a visitor opens a live demo, sessions, viewers, and milestone events show up here."
      action={
        <Button asChild size="sm">
          <Link href="/dashboard/templates">Create a demo</Link>
        </Button>
      }
    />
  );
}
