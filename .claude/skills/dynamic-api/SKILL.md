---
name: dynamic-api
description: Use when the user needs to call the Dynamic REST API directly for operations not covered by the Node SDK or Javascript SDK — environments, users, wallets, allowlists, or any other server-side admin operation. Triggers on phrases like "dynamic api", "dynamic rest api", "call the dynamic admin api", "fetch users from dynamic", "update environment via api", "dyn_ token". For SDK-covered operations (wallet creation, signing, browser-side auth), prefer the Node SDK (`dynamic-node-sdk`) or Javascript SDK (`dynamic-javascript-sdk`) skills first; reach for the REST API only when the SDK doesn't expose what you need.
---

# Dynamic REST API

## When to reach for the API vs an SDK

| Need | Use |
|---|---|
| Create a server-managed MPC wallet, sign on server | `dynamic-node-sdk` skill |
| Authenticate users in the browser, render embedded wallets | `dynamic-javascript-sdk` skill |
| Verify Dynamic-issued JWTs on your backend | https://www.dynamic.xyz/docs/overview/authentication/tokens |
| Read/write environments, users, wallets, allowlists, dashboard config | **This skill — Dynamic REST API** |

If a Dynamic SDK exposes the operation, prefer the SDK. Reach for the REST API only for admin/management surfaces the SDKs don't cover.

## Base URL

```
https://app.dynamic.xyz/api/v0/
```

## Authentication

Two credential types, both passed via the standard `Authorization: Bearer <token>` header:

| Credential | Format | Source | Use for |
|---|---|---|---|
| **Admin API token** | `dyn_` + 56 alphanumeric chars | Developer Dashboard → Developer → API Tokens (https://app.dynamic.xyz/dashboard/developer/api) | Admin / management endpoints — anything operating on environment-level resources |
| **User JWT** | Standard JWT | `getAuthToken()` from the JS SDK, server-side `verifyDynamicJWT` for verification | User-scoped endpoints — anything operating on a specific authenticated user's data |

```http
Authorization: Bearer dyn_aBcDeF...   (admin)
Authorization: Bearer eyJhbGc...      (user JWT)
```

**Never expose the `dyn_` admin token to the client.** It's a server-level credential — store in env (`DYNAMIC_AUTH_TOKEN` or similar), never in browser-side code, never logged.

Dynamic does NOT retain plaintext copies of admin tokens. Copy on creation, store securely, rotate by issuing a new one if compromised.

## Operation categories

Per Dynamic's docs index:

- **Environments** — fetch / update environment configuration (auth methods, chains, branding, etc.).
- **Users** — list, fetch, update, delete user records under an environment.
- **Wallets** — wallet metadata, allowlists, account linking.
- **Allowlists** — manage allowlist entries for gated environments.
- Plus dashboard-administrative operations not enumerated in the overview.

For the exhaustive endpoint inventory, consult the live docs at https://www.dynamic.xyz/docs/api-reference/overview (or the LLM-readable index at https://www.dynamic.xyz/docs/llms.txt). The skill author should always read the live reference for the specific endpoint shape — this skill names the auth pattern and base URL, not endpoint signatures.

## Standard HTTP status codes

| Code | Meaning |
|---|---|
| `400` | Invalid request format (validation, bad JSON, bad params) |
| `401` | Missing `Authorization` header or invalid token |
| `403` | Token present but lacks permission for the operation |
| `404` | Resource not found |

## Rate limits

Dynamic's API endpoints are rate-limited. Specific limits are documented at https://www.dynamic.xyz/docs/api-reference/rate-limits. Implement exponential backoff on 429 responses; do not retry 4xx errors aside from 429 / 401 (after token refresh).

## Pagination

The overview doesn't document pagination conventions; consult the specific endpoint's docs (cursor-based and offset-based both appear in the API surface). When in doubt, page sizes are typically 50–100; cursor-based endpoints return a `nextCursor` token to pass to the subsequent request.

## Auth-token permissions

Admin tokens have scoped permissions. Before relying on a token in code, verify its scopes at:
https://www.dynamic.xyz/docs/overview/developer-dashboard/api-token-permissions

A `403` usually means the token is valid but lacks the scope for the requested operation. Generate a new token with the right scope; do not work around it client-side.

## How to use this skill

1. Identify the operation the user actually needs.
2. **Check whether `dynamic-node-sdk` or `dynamic-javascript-sdk` covers it first.** If yes, use the SDK skill instead — this skill is the escape hatch, not the default.
3. Look up the specific endpoint signature in the live docs (https://www.dynamic.xyz/docs/api-reference/overview). Do NOT guess endpoint paths — Dynamic's API surface evolves.
4. Use the auth pattern above. For admin operations, the `dyn_` token. For user-scoped operations, the user's JWT obtained via the JS SDK.
5. Handle rate limits with exponential backoff. Map 401 to a clear "token invalid or expired" error; 403 to "token lacks permission for X."

## What this skill is NOT

- A list of endpoint signatures. The live docs are authoritative; reading them at use-time is the rule (D-027 — external docs are the source of truth).
- A pattern for browser-side calls. Browser calls go through the JS SDK; only the JS SDK's user JWT is appropriate for client-originated requests. The `dyn_` admin token is server-only.
- A replacement for the SDKs. Use the SDKs whenever they cover the operation.
