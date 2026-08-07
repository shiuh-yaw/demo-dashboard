/**
 * Turning a thrown SDK error into something a widget can render.
 *
 * The rule that matters: **never swallow the server's own explanation.** This
 * is a developer-facing demo, so an unrecognized failure surfaces the SDK's
 * message and error code rather than a generic "something went wrong" — that
 * string is reserved for a throw carrying no text at all.
 *
 * Recognition keys off HTTP `status` and `code`, not prose. The SDK's
 * `APIError` (`@dynamic-labs-sdk/client/core`) carries `status`, `code`, and
 * `payload`; those are read structurally rather than by `instanceof` so a
 * rejection that isn't an `APIError` — a wrapped fetch failure, a
 * cancelled step-up — still lands in the right branch.
 */

/** Parsed error with a title and an optional second line. */
export interface ParsedError {
  title: string;
  description?: string;
}

/** The fields worth reading off a thrown value, however it was constructed. */
interface ErrorLike {
  status?: number;
  code?: string;
  message?: string;
  shortMessage?: string;
  details?: string;
}

const GENERIC = "Something went wrong. Please try again.";

function read(error: unknown): ErrorLike {
  if (typeof error === "string") return { message: error };
  if (typeof error !== "object" || error === null) return {};
  const e = error as Record<string, unknown>;
  return {
    status: typeof e.status === "number" ? e.status : undefined,
    code: typeof e.code === "string" ? e.code : undefined,
    message: typeof e.message === "string" ? e.message : undefined,
    shortMessage:
      typeof e.shortMessage === "string" ? e.shortMessage : undefined,
    details: typeof e.details === "string" ? e.details : undefined,
  };
}

/** The most specific human-readable text the throw carries, if any. */
function text(e: ErrorLike): string {
  return (e.shortMessage || e.message || e.details || "").trim();
}

/** `<text> (code)` — the code is what makes an unrecognized failure actionable. */
function withCode(body: string, e: ErrorLike): string | undefined {
  const parts = [body.trim(), e.code ? `(${e.code})` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

export function parseError(
  error: unknown,
  defaultMessage = GENERIC,
): ParsedError {
  if (!error) return { title: "" };

  const e = read(error);
  const body = text(e);
  // Codes are snake_case, messages are prose - flatten both separators so one
  // phrase matches either (`elevated_access_token_required` / "elevated
  // access token required").
  const lower = `${body} ${e.code ?? ""}`.toLowerCase().replace(/[_-]+/g, " ");

  // Step-up declined in the prompt, not a server failure.
  if (lower.includes("verification cancelled")) return { title: "Cancelled" };

  // --- Recognized conditions, keyed on code or an unambiguous phrase --------

  if (lower.includes("elevated access token")) {
    return {
      title: "Verification needed",
      description:
        "This action needs a fresh elevated access token. Try again and complete the verification prompt.",
    };
  }

  // A rejected session. Reached by code as well as by status, because the SDK
  // throws this one with `code: "unauthorized_error"` and no `status`, which
  // used to fall through to the raw message.
  //
  // All three causes are named, because they are indistinguishable here and
  // lead to different reactions: the token expired; it belongs to another
  // Dynamic environment (what happens when the cluster or env id changes); or
  // the mutation just made succeeded and re-issued the session, in which case
  // the change DID land and calling it a failure would be wrong.
  if (lower.includes("unauthorized")) {
    return {
      title: "Session not accepted",
      description: withCode(
        "It expired, was issued for a different Dynamic environment, or the action you just took ended it - changing wallets, signers or roles re-issues the session. Sign in again; the change may already have gone through.",
        e,
      ),
    };
  }

  if (lower.includes("zero active signers") || lower.includes("last signer")) {
    return {
      title: "Cannot remove the last signer",
      description:
        "A wallet must keep at least one active signer. Add another signer first.",
    };
  }

  if (lower.includes("last wallet")) {
    return {
      title: "Cannot remove the last wallet",
      description: "An account must keep at least one wallet.",
    };
  }

  // --- Status-driven ------------------------------------------------------

  switch (e.status) {
    case 401:
      // Same two causes as the code-keyed branch above; kept in step with it.
      return {
        title: "Session not accepted",
        description: withCode(
          "It expired, was issued for a different Dynamic environment, or the action you just took ended it - changing wallets, signers or roles re-issues the session. Sign in again; the change may already have gone through.",
          e,
        ),
      };

    case 403:
      // The two ways a business-account call is refused: the environment does
      // not have the feature, or the caller's role does not allow it. Both are
      // named because the server's 403 does not always distinguish them.
      return {
        title: "Not permitted on this environment",
        description: withCode(
          body ||
            "Business Accounts is early access - check that the enable-business-accounts flag is on for this Dynamic environment, and that your role on the account allows this action.",
          e,
        ),
      };

    case 404:
      // The API returns 404 rather than 403 for a non-member so account
      // existence never leaks.
      return {
        title: "Account not found",
        description: withCode(
          "You are not a member of this account, or it no longer exists.",
          e,
        ),
      };

    case 409:
      return {
        title: "Conflicts with the account's current state",
        description: withCode(body || "The server refused this change.", e),
      };

    case 422:
      return {
        title: "Request rejected",
        description: withCode(body || "Check the values and try again.", e),
      };

    case 429:
      return {
        title: "Too many attempts",
        description: withCode("Try again shortly.", e),
      };
  }

  if (e.status && e.status >= 500) {
    return {
      title: "Dynamic API error",
      description: withCode(body || `HTTP ${e.status}.`, e),
    };
  }

  if (lower.includes("invalid otp") || lower.includes("verification failed")) {
    return { title: "Invalid verification code" };
  }

  // --- Unrecognized: show what the SDK said, never hide it -----------------

  if (!body) return { title: defaultMessage };

  if (body.length > 140) {
    const first = (body.split(". ")[0] ?? body).trim();
    return {
      title: "Request failed",
      description: withCode(`${first.slice(0, 140)}…`, e),
    };
  }

  return { title: body, description: e.code ? `(${e.code})` : undefined };
}

/** Flattened single-line form, for logs. */
export function getErrorMessage(
  error: unknown,
  defaultMessage?: string,
): string {
  const { title, description } = parseError(error, defaultMessage);
  return description ? `${title}: ${description}` : title;
}
