import { NextResponse } from "next/server";
import { getUser, updateUserMetadata } from "@dynamic-demos/dynamic";
import { getServerUserData } from "@/lib/auth/server-auth";
import { env } from "@/lib/env";

const METADATA_KEYS = {
  defaultMethod: "vd_default_payout_method",
  walletAddress: "vd_wallet_address",
  walletProvider: "vd_wallet_provider",
} as const;

/**
 * Shape returned from GET + accepted by PUT. Every field is optional
 * so the UI can send partial updates (e.g. just swap `defaultMethod`
 * without touching wallet selection).
 */
interface Preferences {
  defaultMethod: string | null;
  walletAddress: string | null;
  walletProvider: string | null;
}

function emptyPrefs(): Preferences {
  return {
    defaultMethod: null,
    walletAddress: null,
    walletProvider: null,
  };
}

function coerceString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/preferences
 * Returns the user's persisted payout preferences from Dynamic
 * metadata — default payout method AND wallet selection — so the
 * wallet survives a logout/login cycle on any device.
 *
 * Responds with nulls across the board when DYNAMIC_API_KEY is not
 * configured so the client silently falls back to localStorage.
 */
export async function GET() {
  if (!env.DYNAMIC_API_KEY) {
    return NextResponse.json(emptyPrefs());
  }

  try {
    const user = await getServerUserData({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json(emptyPrefs());
    }

    const dynUser = await getUser(user.userId);
    const meta = dynUser?.metadata ?? {};

    const defaultMethodRaw = coerceString(meta[METADATA_KEYS.defaultMethod]);
    const defaultMethod =
      defaultMethodRaw && ["bank", "wallet", "card"].includes(defaultMethodRaw)
        ? defaultMethodRaw
        : null;

    return NextResponse.json({
      defaultMethod,
      walletAddress: coerceString(meta[METADATA_KEYS.walletAddress]),
      walletProvider: coerceString(meta[METADATA_KEYS.walletProvider]),
    } satisfies Preferences);
  } catch {
    return NextResponse.json(emptyPrefs());
  }
}

/**
 * PUT /api/preferences
 * Persists any subset of the user's preferences to Dynamic metadata.
 * Pass `null` for a field to clear it; omit the field to leave it
 * untouched (Dynamic's `updateUserMetadata` merges the payload).
 */
export async function PUT(req: Request) {
  if (!env.DYNAMIC_API_KEY) {
    return NextResponse.json(
      { ok: false, reason: "DYNAMIC_API_KEY not configured" },
      { status: 501 },
    );
  }

  try {
    const user = await getServerUserData({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<
      Record<keyof Preferences, unknown>
    >;

    // Build a minimal metadata patch containing only fields the
    // caller actually included in the request.
    const patch: Record<string, string> = {};

    if ("defaultMethod" in body) {
      if (body.defaultMethod === null) {
        patch[METADATA_KEYS.defaultMethod] = "";
      } else if (
        typeof body.defaultMethod === "string" &&
        ["bank", "wallet", "card"].includes(body.defaultMethod)
      ) {
        patch[METADATA_KEYS.defaultMethod] = body.defaultMethod;
      } else {
        return NextResponse.json(
          { error: "Invalid defaultMethod" },
          { status: 400 },
        );
      }
    }

    if ("walletAddress" in body) {
      if (body.walletAddress === null) {
        patch[METADATA_KEYS.walletAddress] = "";
      } else if (typeof body.walletAddress === "string") {
        patch[METADATA_KEYS.walletAddress] = body.walletAddress.trim();
      } else {
        return NextResponse.json(
          { error: "Invalid walletAddress" },
          { status: 400 },
        );
      }
    }

    if ("walletProvider" in body) {
      if (body.walletProvider === null) {
        patch[METADATA_KEYS.walletProvider] = "";
      } else if (typeof body.walletProvider === "string") {
        patch[METADATA_KEYS.walletProvider] = body.walletProvider.trim();
      } else {
        return NextResponse.json(
          { error: "Invalid walletProvider" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields in request" },
        { status: 400 },
      );
    }

    await updateUserMetadata(user.userId, patch);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/preferences]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save preferences",
      },
      { status: 500 },
    );
  }
}
