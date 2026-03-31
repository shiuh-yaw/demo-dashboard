/**
 * Polymarket markets - fetch via Events API with tag_slug (official categories)
 *
 * Returns EVENTS (not flat markets). Each event contains multiple markets.
 * Display one card per event; click → event detail page with all markets.
 * @see Gamma API: GET /events?tag_slug=crypto
 */

import { polymarketFetch } from "./client";
import { z } from "zod";
import {
  polymarketMarketSchema,
  eventsResponseSchema,
  polymarketEventSchema,
} from "./schema";
import type {
  PolymarketMarketTransformed,
  PolymarketEventTransformed,
} from "./types";

/** Polymarket tag slugs that map to our UI categories */
export const POLYMARKET_TAG_SLUGS = [
  "tech",
  "sports",
  "crypto",
  "weather",
  "finance",
] as const;

function transformMarket(
  market: z.infer<typeof polymarketMarketSchema>,
  categorySlug: string,
  now: number,
): PolymarketMarketTransformed | null {
  if (!market.endDate) return null;
  try {
    let outcomes: string[] = ["Yes", "No"];
    let prices: string[] = ["0", "0"];

    if (market.outcomes) {
      try {
        outcomes = JSON.parse(market.outcomes) as string[];
      } catch {
        // Use defaults
      }
    }

    if (market.outcomePrices) {
      try {
        prices = JSON.parse(market.outcomePrices) as string[];
      } catch {
        // Use defaults
      }
    }

    const lowerOutcomes = outcomes.map((o) => o.toLowerCase());
    const yesIndex = lowerOutcomes.findIndex(
      (o) => o.includes("yes") || o === "true",
    );
    const noIndex = lowerOutcomes.findIndex(
      (o) => o.includes("no") || o === "false",
    );

    const finalYesIndex = yesIndex >= 0 ? yesIndex : 0;
    const finalNoIndex = noIndex >= 0 ? noIndex : yesIndex >= 0 ? 1 : 1;

    let yesPriceNum = parseFloat(prices[finalYesIndex] || "0");
    let noPriceNum = parseFloat(prices[finalNoIndex] || "0");

    const priceSum = yesPriceNum + noPriceNum;
    if (priceSum <= 1.5 && priceSum > 0) {
      yesPriceNum *= 100;
      noPriceNum *= 100;
    }

    const total = yesPriceNum + noPriceNum;
    if (total > 0) {
      const factor = 100 / total;
      yesPriceNum *= factor;
      noPriceNum *= factor;
    } else {
      yesPriceNum = 50;
      noPriceNum = 50;
    }

    const yesPrice = Math.max(0, Math.min(100, yesPriceNum)).toFixed(1);
    const noPrice = Math.max(0, Math.min(100, noPriceNum)).toFixed(1);

    let yesTokenId: string | undefined;
    let noTokenId: string | undefined;
    if (market.clobTokenIds) {
      try {
        const tokenIds = JSON.parse(market.clobTokenIds) as string[];
        if (tokenIds.length >= 2) {
          yesTokenId = tokenIds[finalYesIndex] || tokenIds[0];
          noTokenId = tokenIds[finalNoIndex] || tokenIds[1];
        }
      } catch {
        // Ignore parse errors
      }
    }

    const category =
      categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
    const rawCategory = categorySlug;

    const volume =
      market.volumeNum ?? (market.volume ? parseFloat(market.volume) : 0);
    const yesTraders = Math.floor(volume * 0.4);
    const noTraders = Math.floor(volume * 0.3);

    const tags: string[] = [];
    const endTime = new Date(market.endDate).getTime();
    const hoursUntilEnd = (endTime - now) / (1000 * 60 * 60);

    if (hoursUntilEnd > 0 && hoursUntilEnd < 24) {
      tags.push("ending soon");
    }
    if (volume < 1000) {
      tags.push("new");
    }
    if (volume > 50000) {
      tags.push("hot");
    }
    const totalTraders = yesTraders + noTraders;
    if (totalTraders > 100) {
      tags.push("trending");
    }
    if (volume > 200000) {
      tags.push("high stakes");
    }
    const priceDiff = Math.abs(parseFloat(yesPrice) - parseFloat(noPrice));
    if (priceDiff < 10) {
      tags.push("close call");
    }

    const imageUrl =
      market.imageOptimized?.imageUrlOptimized ||
      market.imageOptimized?.imageUrlSource ||
      market.iconOptimized?.imageUrlOptimized ||
      market.iconOptimized?.imageUrlSource ||
      market.image ||
      market.icon ||
      "";

    const outcomeLabel =
      typeof market.groupItemTitle === "string" && market.groupItemTitle.trim()
        ? market.groupItemTitle.trim()
        : undefined;

    return {
      id: market.id,
      question: market.question ?? "",
      outcomeLabel,
      endDate: market.endDate,
      yesPrice,
      noPrice,
      category,
      rawCategory,
      imageUrl,
      yesTraders,
      noTraders,
      conditionId: market.conditionId,
      yesTokenId,
      noTokenId,
      tags,
      volume,
    };
  } catch {
    return null;
  }
}

function transformEvent(
  event: z.infer<typeof polymarketEventSchema>,
  tagSlug: string,
  now: number,
): PolymarketEventTransformed | null {
  const markets = event.markets ?? [];
  const rawSlug = event.slug ?? event.id;
  const eventSlug =
    typeof rawSlug === "string" ? rawSlug : String(event.id ?? "");

  const transformedMarkets: PolymarketMarketTransformed[] = [];
  let totalVolume = 0;
  let earliestEndDate = "";

  for (const market of markets) {
    if (!market.endDate || market.closed) continue;
    const endTime = new Date(market.endDate).getTime();
    if (endTime < now) continue;
    if (market.active === false) continue;

    const transformed = transformMarket(market, tagSlug, now);
    if (transformed) {
      transformedMarkets.push(transformed);
      totalVolume += transformed.volume;
      if (
        !earliestEndDate ||
        new Date(transformed.endDate).getTime() <
          new Date(earliestEndDate).getTime()
      ) {
        earliestEndDate = transformed.endDate;
      }
    }
  }

  if (transformedMarkets.length === 0) return null;

  const category =
    tagSlug.charAt(0).toUpperCase() + tagSlug.slice(1);
  const eventTags: string[] = [];
  if (totalVolume > 100000) eventTags.push("hot");
  if (totalVolume > 500000) eventTags.push("high stakes");
  if (transformedMarkets.length > 1) eventTags.push("trending");

  const imageUrl = String(
    event.image ||
      event.icon ||
      transformedMarkets[0]?.imageUrl ||
      "",
  );

  const title =
    (typeof event.title === "string" ? event.title : null) ??
    transformedMarkets[0]?.question ??
    "Prediction";

  const startDate =
    typeof event.startDate === "string" && event.startDate.trim()
      ? event.startDate
      : undefined;

  return {
    id: event.id,
    slug: eventSlug,
    title,
    imageUrl,
    category,
    rawCategory: tagSlug,
    volume: totalVolume,
    markets: transformedMarkets,
    endDate: earliestEndDate,
    startDate,
    tags: eventTags,
  };
}

async function fetchEventsByTag(
  tagSlug: string,
  limit: number,
): Promise<z.infer<typeof polymarketEventSchema>[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("tag_slug", tagSlug);
  searchParams.set("limit", String(limit));
  searchParams.set("closed", "false");
  searchParams.set("active", "true");
  searchParams.set("order", "volume24hr");
  searchParams.set("ascending", "false");

  const raw = await polymarketFetch<unknown>(
    `/events?${searchParams.toString()}`,
  );

  const parsed = eventsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  return parsed.data;
}

export interface GetPolymarketEventsParams {
  /** Max events per category. Default 30. */
  limitPerCategory?: number;
  /** Categories to fetch. Default: tech, sports, crypto, weather, finance */
  categories?: readonly string[];
}

export async function getPolymarketEvents(
  params?: GetPolymarketEventsParams,
): Promise<PolymarketEventTransformed[]> {
  const limitPerCategory = params?.limitPerCategory ?? 30;
  const categories =
    (params?.categories as string[] | undefined) ?? [...POLYMARKET_TAG_SLUGS];

  const now = Date.now();

  const eventArrays = await Promise.all(
    categories.map((tag) => fetchEventsByTag(tag, limitPerCategory)),
  );

  const allEvents: PolymarketEventTransformed[] = [];

  for (let i = 0; i < categories.length; i++) {
    const events = eventArrays[i] ?? [];
    const tagSlug = categories[i] ?? "tech";

    for (const event of events) {
      const transformed = transformEvent(event, tagSlug, now);
      if (transformed) allEvents.push(transformed);
    }
  }

  allEvents.sort((a, b) => b.volume - a.volume);
  return allEvents;
}

export async function getPolymarketEventBySlug(
  slug: string,
): Promise<PolymarketEventTransformed | null> {
  const searchParams = new URLSearchParams();
  searchParams.set("slug", slug);
  searchParams.set("limit", "1");
  searchParams.set("closed", "false");

  const raw = await polymarketFetch<unknown>(
    `/events?${searchParams.toString()}`,
  );

  const parsed = eventsResponseSchema.safeParse(raw);
  const event = parsed.success && parsed.data.length > 0 ? parsed.data[0] : null;
  if (!event) return null;

  const now = Date.now();
  const tagSlug = event.tags?.[0]?.slug ?? "tech";
  return transformEvent(event, tagSlug, now);
}

/** @deprecated Use getPolymarketEvents - returns events with nested markets */
export async function getPolymarketMarkets(
  params?: GetPolymarketEventsParams,
): Promise<PolymarketMarketTransformed[]> {
  const events = await getPolymarketEvents(params);
  return events.flatMap((e) => e.markets);
}
