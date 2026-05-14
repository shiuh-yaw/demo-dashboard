// Shared Vercel API helper used by `setup-vercel-project.mjs` and
// `teardown-vercel-project.mjs`. Wraps `fetch` so tests can inject a mock.
//
// Phase 6B of the demo meta-system. See
// docs/projects/demo-meta-system/phases/06-skill.md.

const DEFAULT_BASE_URL = "https://api.vercel.com";

/**
 * Build a `vercelFetch(path, init)` helper bound to the given token.
 *
 * The returned function:
 *  - prefixes `path` with the configured Vercel API base URL
 *  - injects `Authorization: Bearer <token>`
 *  - applies `Content-Type: application/json` when a body is present
 *  - parses JSON responses; throws on non-2xx with the parsed error body
 *  - accepts an optional `fetchImpl` so tests can inject a mock
 *
 * @param {{ token: string, baseUrl?: string, fetchImpl?: typeof fetch }} opts
 */
export function createVercelFetch({ token, baseUrl, fetchImpl } = {}) {
  if (!token) {
    throw new Error("VERCEL_TOKEN is required");
  }
  const apiBase = baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  return async function vercelFetch(path, init = {}) {
    const headers = {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    };
    if (init.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await doFetch(`${apiBase}${path}`, { ...init, headers });

    const text = await res.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const err = new Error(
        `Vercel API ${res.status} ${path}: ${
          typeof parsed === "string"
            ? parsed
            : JSON.stringify(parsed?.error ?? parsed)
        }`,
      );
      err.status = res.status;
      err.body = parsed;
      throw err;
    }

    return parsed;
  };
}

/**
 * Look up a project by name. Returns the project record or `null` when the
 * project does not exist. (Vercel returns 404 on `GET /v9/projects/<id>` when
 * the project is absent.)
 */
export async function findProject(vercelFetch, name) {
  try {
    return await vercelFetch(`/v9/projects/${encodeURIComponent(name)}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
