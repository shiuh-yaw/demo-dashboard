/**
 * The signed-in user's hidden business accounts, stored on their Dynamic user
 * metadata.
 *
 * Why a route at all: the metadata write goes through Dynamic's admin API,
 * which authenticates with a server token (`DYNAMIC_API_KEY`). That token can
 * edit ANY user in the environment, so it never reaches the browser - the
 * client sends its own JWT, this route verifies it, and the user id it acts on
 * comes from that verified token and nowhere else. A body-supplied user id
 * would turn a hide button into "edit anyone's metadata".
 *
 * Why not `localStorage`, which this replaced: it is per browser. Hiding an
 * account and then clearing the cache brought it straight back, which is what
 * exposed the choice as device-local rather than a property of the user.
 *
 * Key and parsing live in `@dynamic-demos/dynamic` so the shape is declared
 * once for every app that touches Dynamic metadata.
 */

import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getHiddenBusinessAccounts,
  getUser,
  getUserIdFromPayload,
  setHiddenBusinessAccounts,
} from "@dynamic-demos/dynamic";

/** Whoever the caller's own JWT says they are - never a body field. */
async function authenticate(request: Request): Promise<string | null> {
  const payload = await getAuthenticatedUser(request);
  if (!payload) return null;
  return getUserIdFromPayload(payload) ?? null;
}

function missingKey(): NextResponse | null {
  if (process.env.DYNAMIC_API_KEY?.trim()) return null;
  return NextResponse.json(
    { error: "DYNAMIC_API_KEY is not set on this deployment." },
    { status: 501 },
  );
}

export async function GET(request: Request) {
  const notConfigured = missingKey();
  if (notConfigured) return notConfigured;

  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUser(userId);
    // No user record yet is not an error - it is a new user with nothing
    // hidden, which reads the same as an empty list.
    return NextResponse.json({
      hidden: user ? getHiddenBusinessAccounts(user) : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed" },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request) {
  const notConfigured = missingKey();
  if (notConfigured) return notConfigured;

  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hidden = (body as { hidden?: unknown })?.hidden;
  if (!Array.isArray(hidden) || hidden.some((id) => typeof id !== "string")) {
    return NextResponse.json(
      { error: "`hidden` must be an array of strings." },
      { status: 400 },
    );
  }

  try {
    // Returns the stored list, deduped and capped, so the client adopts what
    // the server actually kept rather than what it hoped it sent.
    const stored = await setHiddenBusinessAccounts(userId, hidden as string[]);
    return NextResponse.json({ hidden: stored });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 502 },
    );
  }
}
