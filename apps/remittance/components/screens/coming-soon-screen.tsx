"use client";

import { Construction } from "lucide-react";
import { WidgetCard, Button } from "@dynamic-demos/ui";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface ComingSoonScreenProps {
  feature: string;
  navigation: NavigationReturn;
}

export function ComingSoonScreen({
  feature,
  navigation,
}: ComingSoonScreenProps) {
  return (
    <WidgetCard title={feature}>
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-16 h-16 rounded-full bg-(--widget-row-bg) flex items-center justify-center">
          <Construction className="w-8 h-8 text-(--widget-muted)" />
        </div>
        <p className="text-sm text-(--widget-muted)">
          {feature} is coming soon
        </p>
        <Button variant="outline" onClick={navigation.goToDashboard}>
          Back to Dashboard
        </Button>
      </div>
    </WidgetCard>
  );
}
