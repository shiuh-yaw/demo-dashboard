"use client";

/**
 * Predictions content with category nav and filtered event grid.
 */

import { useMemo, useState } from "react";
import { CategoryNav } from "./category-nav";
import { PredictionsGrid } from "./predictions-grid";
import { MyPredictionsSection } from "./my-predictions-section";
import type { PolymarketEventTransformed } from "@dynamic-demos/polymarket";

interface PredictionsContentProps {
  events: PolymarketEventTransformed[];
}

export function PredictionsContent({ events }: PredictionsContentProps) {
  const [activeCategory, setActiveCategory] = useState("tech");

  const categories = useMemo(() => {
    const fixed = ["tech", "sports", "crypto", "weather", "finance"];
    return fixed;
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => e.rawCategory === activeCategory);
  }, [events, activeCategory]);

  return (
    <div className="space-y-6">
      <MyPredictionsSection />
      <CategoryNav
        categories={categories}
        active={activeCategory}
        onSelect={setActiveCategory}
      />
      <PredictionsGrid events={filteredEvents} />
    </div>
  );
}
