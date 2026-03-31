/**
 * Zod schemas for Polymarket API validation
 */

import { z } from "zod";

export const imageOptimizationSchema = z
  .object({
    imageUrlSource: z.string().nullable().optional(),
    imageUrlOptimized: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const seriesSchema = z.object({ slug: z.string().optional() }).passthrough();
const eventSchema = z
  .object({
    seriesSlug: z.string().optional(),
    series: z.array(seriesSchema).optional(),
  })
  .passthrough();

export const polymarketMarketSchema = z.object({
  id: z.string(),
  question: z.string().nullable().optional(),
  conditionId: z.string(),
  slug: z.string().nullable().optional(),
  endDate: z.string().optional(),
  category: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  imageOptimized: imageOptimizationSchema,
  iconOptimized: imageOptimizationSchema,
  outcomes: z.string().optional(),
  outcomePrices: z.string().optional(),
  volume: z.string().optional(),
  volumeNum: z.number().nullable().optional(),
  active: z.boolean().nullable().optional(),
  closed: z.boolean().nullable().optional(),
  clobTokenIds: z.string().optional(),
  events: z.array(eventSchema).optional(),
  /** Outcome label for multi-outcome events (e.g. "NVIDIA", "Apple") */
  groupItemTitle: z.string().nullable().optional(),
});

export const polymarketMarketTransformedSchema = z.object({
  id: z.string(),
  question: z.string(),
  outcomeLabel: z.string().optional(),
  endDate: z.string(),
  yesPrice: z.string(),
  noPrice: z.string(),
  category: z.string(),
  rawCategory: z.string().optional(),
  imageUrl: z.string(),
  yesTraders: z.number(),
  noTraders: z.number(),
  conditionId: z.string(),
  yesTokenId: z.string().optional(),
  noTokenId: z.string().optional(),
  tags: z.array(z.string()),
  volume: z.number(),
});

export const marketsResponseSchema = z.union([
  z.array(polymarketMarketSchema),
  z.object({
    data: z.array(polymarketMarketSchema).optional(),
    results: z.array(polymarketMarketSchema).optional(),
    markets: z.array(polymarketMarketSchema).optional(),
  }),
]);

/** Event from Gamma API - contains nested markets and tags */
export const polymarketEventSchema = z.object({
  id: z.string(),
  slug: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  markets: z.array(polymarketMarketSchema).optional(),
  tags: z.array(z.object({ slug: z.string().optional() })).optional(),
}).passthrough();

export const eventsResponseSchema = z.array(polymarketEventSchema);

export type PolymarketMarketInput = z.infer<typeof polymarketMarketSchema>;
export type PolymarketMarketTransformedOutput = z.infer<
  typeof polymarketMarketTransformedSchema
>;
