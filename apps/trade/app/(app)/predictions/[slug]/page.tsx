/**
 * Event Detail Page
 *
 * Shows a single prediction event with all its markets (outcomes).
 * User can trade each outcome.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPolymarketEventBySlug } from "@dynamic-demos/polymarket";
import { EventDetailClient } from "./event-detail-client";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await getPolymarketEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-1 text-sm font-medium text-trade-text-secondary hover:text-trade-text-primary"
      >
        <ChevronLeft size={16} />
        Back to Predict
      </Link>

      <EventDetailClient event={event} />
    </div>
  );
}
