#!/usr/bin/env tsx
import { getRedis, REDIS_KEYS } from "@/lib/redis";

const id = process.argv[2];
if (!id) {
  console.error("usage: tsx inspect-brand-profile.ts <brand-profile-id>");
  process.exit(1);
}

const r = getRedis();
const profile = await r.get(REDIS_KEYS.brandProfile(id));
console.log(JSON.stringify(profile, null, 2));
