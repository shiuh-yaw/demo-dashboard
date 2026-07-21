/**
 * Vitest setup — populate the env vars that `@/env` validates so importing
 * any module that pulls in `lib/redis.ts` (and therefore `env.ts`) doesn't
 * blow up at module load time. The values are dummies; service tests never
 * actually open a Redis connection — they inject a fake client.
 */

// `process.env` is typed as `Record<string, string | undefined>` in Node,
// but TS narrows `NODE_ENV` to a readonly literal via `@types/node`. Work
// around that by writing through a widened reference.
const procEnv = process.env as Record<string, string | undefined>;
procEnv.COINBASE_API_KEY ??= "test_coinbase_api_key";
procEnv.COINBASE_API_SECRET ??= "test_coinbase_api_secret";
procEnv.COINBASE_API_ENVIRONMENT ??= "sandbox";
procEnv.LIFI_API_KEY ??= "test_lifi_api_key";
procEnv.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ??= "test_dynamic_env_id";
procEnv.TRACK_CORS_ORIGINS ??= "https://wallet.dynamic.dev";
procEnv.NODE_ENV ??= "test";
