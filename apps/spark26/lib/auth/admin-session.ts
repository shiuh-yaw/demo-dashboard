import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export const ADMIN_COOKIE_NAME = "spark26_admin";
export const ADMIN_COOKIE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

type Payload = { iat: number; exp: number };
export type VerifyResult =
  | { ok: true; payload: Payload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

function base64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function hmac(payloadB64: string): string {
  const secret = env.SPARK26_ADMIN_SECRET;
  if (!secret) throw new Error("SPARK26_ADMIN_SECRET is not set");
  return base64urlEncode(
    createHmac("sha256", secret).update(payloadB64).digest(),
  );
}

export function signAdminSession(nowMs: number = Date.now()): string {
  const payload: Payload = { iat: nowMs, exp: nowMs + ADMIN_COOKIE_TTL_MS };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyAdminSession(
  cookie: string,
  nowMs: number = Date.now(),
): VerifyResult {
  const parts = cookie.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return { ok: false, reason: "malformed" };

  const expected = hmac(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || payload.exp < nowMs) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
