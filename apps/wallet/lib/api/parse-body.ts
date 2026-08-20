import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Parse and validate a JSON request body.
 *
 * Returns either the parsed data or a ready-to-return 400 - never both, so
 * the caller's narrowing is exhaustive:
 *
 * ```ts
 * const parsed = await parseJsonBody(request, schema);
 * if (parsed.error) return parsed.error;
 * parsed.data; // typed
 * ```
 *
 * Malformed JSON and schema violations are the same outcome to a caller, so
 * they collapse into one branch. The zod issues are logged, not returned - a
 * public endpoint shouldn't narrate its schema back to an unauthenticated
 * caller.
 */
export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  context?: string,
): Promise<{ data: z.infer<TSchema>; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    if (context) {
      console.warn(`[${context}] invalid request body:`, result.error.issues);
    }
    return {
      error: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}
