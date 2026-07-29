/**
 * In-memory RainRequester for tests and non-network demos. Returns benign
 * empty-ish payloads by default; override `get`/`post` per test as needed.
 */

import type { RainRequester } from "./client";

export function createFakeRainClient(
  overrides?: Partial<RainRequester>,
): RainRequester {
  return {
    get: async <T>() => ({}) as T,
    post: async <TReq, TRes>() => ({}) as TRes,
    ...overrides,
  };
}
