/**
 * Zod parsing helpers (aligned with dashboard `parseJsonBody` / `parseWithSchema`).
 */

import { type ZodSchema, type ZodError } from "zod";
import { ValidationError } from "./errors";

export function formatZodError(error: ZodError): string {
  const parts = error.errors.map((e) => {
    const path = e.path.length > 0 ? e.path.join(".") : "value";
    return `${path}: ${e.message}`;
  });
  return parts.join(", ");
}

export function parseWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error));
  }
  return result.data;
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  return parseWithSchema(schema, body);
}
