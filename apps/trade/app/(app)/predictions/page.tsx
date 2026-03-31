/**
 * Predictions Page
 *
 * Prediction events from Polymarket. One card per event; click to see markets.
 */

import {
  getPolymarketEvents,
  type PolymarketEventTransformed,
} from "@dynamic-demos/polymarket";
import { PredictionsContent } from "./components/predictions-content";

export default async function PredictionsPage() {
  let events: PolymarketEventTransformed[] = [];
  let error: string | null = null;

  try {
    events = await getPolymarketEvents({
      limitPerCategory: 30,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load events";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-trade-text-primary">
          Predict
        </h1>
        <p className="mt-1 text-sm text-trade-text-secondary">
          Prediction markets for crypto, politics, and world events.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-trade-error/30 bg-trade-error/10 px-4 py-3 text-sm text-trade-error">
          {error}
        </div>
      )}

      <PredictionsContent events={events} />
    </div>
  );
}
