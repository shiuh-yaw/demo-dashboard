import { z } from "zod";

/**
 * Top-level fields for every Fireblocks webhook notification (V2).
 *
 * @see https://developers.fireblocks.com/reference/webhooks-structures-notificationstructure
 */
export const fireblocksWebhookNotificationSchema = z
  .object({
    id: z.string().uuid(),
    resourceId: z.string().optional(),
    webhookId: z.string().uuid().optional(),
    workspaceId: z.string().uuid(),
    eventType: z.string().optional(),
    /** Legacy / migration; prefer `eventType`. */
    type: z.string().optional(),
    createdAt: z.number(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const hasEvent =
      (typeof val.eventType === "string" && val.eventType.length > 0) ||
      (typeof val.type === "string" && val.type.length > 0);
    if (!hasEvent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Missing eventType (or legacy type)",
        path: ["eventType"],
      });
    }
  });

export type FireblocksWebhookNotification = z.infer<
  typeof fireblocksWebhookNotificationSchema
>;

/**
 * Normalize `eventType` / legacy `type` for routing (e.g. `transaction.status.updated`).
 *
 * @see https://developers.fireblocks.com/reference/webhooks-structures-eventtypes
 */
export function normalizeFireblocksEventType(event: {
  eventType?: string;
  type?: string;
}): string {
  const raw = event.eventType ?? event.type ?? "";
  return String(raw).toLowerCase().replaceAll("_", ".");
}

/** `source` / `destination` peer on transaction objects in webhook `data`. */
export const fireblocksWebhookTransferPeerSchema = z
  .object({
    id: z.string().optional(),
    type: z.string(),
    name: z.string().optional(),
    subType: z.string().optional(),
  })
  .passthrough();

/**
 * Transaction payload inside notification `data` for transaction.* events
 * (`transaction.created`, `transaction.status.updated`, etc.).
 */
export const fireblocksTransactionWebhookDataSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    amount: z.union([z.string(), z.number()]).transform(String),
    assetId: z.string(),
    /** e.g. `TRANSFER`, `CONTRACT_CALL`, `APPROVE`, etc. */
    operation: z.string().optional(),
    destination: fireblocksWebhookTransferPeerSchema,
    /** Inbound transfer sender (often present when `source` peer has no address). */
    sourceAddress: z.string().optional(),
  })
  .passthrough();

export type FireblocksTransactionWebhookData = z.infer<
  typeof fireblocksTransactionWebhookDataSchema
>;
