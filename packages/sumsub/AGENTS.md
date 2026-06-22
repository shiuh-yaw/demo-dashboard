---
name: "@dynamic-demos/sumsub"
kind: package
flow_role: utility
custody: n/a
status: experimental
provider:
  name: SumSub
  docs: https://docs.sumsub.com/
  api_reference: https://api.sumsub.com/openapi.json
  agent_docs: https://docs.sumsub.com/llms.txt
  status_page: none
---

# @dynamic-demos/sumsub

SumSub KYC/identity verification API client + webhook verifier + Iron reliance KYC helpers. Wraps the SumSub Public API for applicant management, SDK token generation, share token creation, and identity reuse. Used by dashboard for KYC orchestration and by Iron token sharing flows; demo apps don't import this package directly (D-003).

## Provider documentation

If you are an AI agent integrating against SumSub, **consult the provider docs first**:

- **Main docs:** [docs.sumsub.com](https://docs.sumsub.com/)
- **API reference (OpenAPI):** [api.sumsub.com/openapi.json](https://api.sumsub.com/openapi.json)
- **Agent / LLM docs:** [docs.sumsub.com/llms.txt](https://docs.sumsub.com/llms.txt)
- **Agent skills:** [SumSubstance/agent-skills](https://github.com/SumSubstance/agent-skills)
- **Authentication:** [docs.sumsub.com/reference/authentication](https://docs.sumsub.com/reference/authentication) — HMAC-SHA256 App Token signing
- **Webhooks:** [docs.sumsub.com/docs/webhooks](https://docs.sumsub.com/docs/webhooks)
- **Sandbox:** [docs.sumsub.com/docs/test-in-sandbox](https://docs.sumsub.com/docs/test-in-sandbox)

## Capabilities

- Client factory — `createSumsubClient({ appToken, secretKey, env })`.
- Applicant CRUD — `createApplicant`, `getApplicant`, `getApplicantByExternalId`, `getApplicantStatus`.
- SDK access tokens — `generateAccessToken` for client-side WebSDK initialization.
- Share tokens — `generateShareToken` for reliance KYC / identity reuse across SumSub accounts.
- Identity reuse — `reuseIdentity` and `previewReuseIdentity` for consuming share tokens.
- Sandbox helpers — `resetApplicant` for test resets.
- Webhook verification — `verifySumsubSignature` (HMAC-SHA256 over raw body).
- Webhook normalization — `normalizeSumsubEvent` → `CanonicalEvent`.
- Iron helpers — `buildIronTokenIdentification` and `requiresUserAction` for SumSub → Iron token sharing.

## Public surface

All exports are stable and live at the package root.

- `createSumsubClient`, `SumsubClient`, `CreateSumsubClientOptions` — client factory + types. (stable)
- `signRequest`, `SignedHeaders` — low-level request signing. (stable)
- `resolveSumsubBaseUrl`, `SumsubEnvironment` — env helpers. (stable)
- Types: `Applicant`, `ApplicantReview`, `AccessToken`, `CreateApplicantRequest`, `GenerateAccessTokenRequest`, `GenerateShareTokenRequest`, `ReuseIdentityRequest`, `SumsubWebhookPayload`, etc. (stable)
- `verifySumsubSignature`, `normalizeSumsubEvent`, `SUMSUB_DIGEST_HEADER`, `CanonicalEvent` — webhooks. (stable)
- `buildIronTokenIdentification`, `requiresUserAction`, `IronTokenIdentificationRequest`, `IronTokenIdentificationResponse` — Iron helpers. (stable)

## Dashboard API surface

Demos do not import this package directly. They call the dashboard endpoints below that expose it.

| Endpoint | Method | Purpose | Audience |
|---|---|---|---|
| `/api/sumsub/applicants` | POST | Create a SumSub applicant | demo / operator |
| `/api/sumsub/applicants/[id]` | GET | Get a SumSub applicant | demo / operator |
| `/api/sumsub/applicants/[id]/status` | GET | Get verification status | demo |
| `/api/sumsub/access-token` | POST | Generate SDK access token | demo |
| `/api/sumsub/share-token` | POST | Generate share token for Iron | operator |
| `/api/sumsub/reuse-identity` | POST | Consume a share token | operator |
| `/api/webhooks/sumsub` | POST | Webhook receiver | provider → dashboard |

## Required environment

The package reads no `process.env` directly — credentials live at the dashboard (D-003).

- `SUMSUB_APP_TOKEN` — SumSub App Token (sandbox tokens start with `sbx:`) — required (dashboard runtime).
- `SUMSUB_SECRET_KEY` — Secret key paired with the app token — required.
- `SUMSUB_WEBHOOK_SECRET` — Webhook secret for signature verification — required when wiring the receiver.
- `SUMSUB_ENVIRONMENT` — `sandbox` | `production` — optional, defaults to sandbox (D-005).

## Slots vs invariants

**Slots:** verification level, applicant info, intended use (for Iron token sharing), source key.

**Invariants:**

- Sandbox-by-default (D-005). The base URL is the same for sandbox and production — the app token determines the mode.
- HMAC-SHA256 App Token signing on every API request. The signing string is `<ts><METHOD><path_with_query><body>` with no separators.
- Webhook signatures use `x-payload-digest` header (HMAC-SHA256 of raw body). Must verify before processing.
- Share tokens are single-use. Generate a new one for each Iron identification attempt.
- Apps never import this package — go through the dashboard endpoints listed above (D-001/D-003).

## Integration map

**Imports:** none (uses global `fetch` + `node:crypto`).
**Imported by:** `apps/dashboard` (KYC orchestration, webhook receiver), `@dynamic-demos/iron` (token sharing flow). Demo apps interact via dashboard HTTP API.

## Examples

```ts
import { createSumsubClient } from "@dynamic-demos/sumsub";
import { buildIronTokenIdentification } from "@dynamic-demos/sumsub";

const sumsub = createSumsubClient({
  appToken: process.env.SUMSUB_APP_TOKEN!,
  secretKey: process.env.SUMSUB_SECRET_KEY!,
  env: "sandbox",
});

// Create applicant and start verification
const applicant = await sumsub.createApplicant({
  externalUserId: "user_123",
  levelName: "basic-kyc-level",
});

// Generate SDK token for client-side WebSDK
const sdkToken = await sumsub.generateAccessToken({
  userId: applicant.id,
  levelName: "basic-kyc-level",
});

// After user completes KYC, generate share token for Iron
const shareToken = await sumsub.generateShareToken({
  applicantId: applicant.id,
});

// Build Iron identification request
const ironBody = buildIronTokenIdentification({
  token: shareToken.token,
  intended_use: "PurchaseDigitalAssets",
});
// Pass to ironClient.kyc.startWithToken(...)
```

## Do / Don't

- Do: use sandbox app tokens only during development (prefix `sbx:`). Never expose production tokens.
- Do: verify webhook signatures before processing events.
- Do: keep secrets in dashboard env (D-003) — never in demo apps.
- Don't: import this package from a demo app.
- Don't: reuse share tokens — they are single-use.
- Don't: skip `verifySumsubSignature` on webhook delivery.

## Open questions / known gaps

- Phase 1E re-binds canonical state types to `TransactionState` from `@dynamic-demos/transactions`.
- Phase 5A wires the dashboard webhook framework against `verifySumsubSignature` + `normalizeSumsubEvent`.
- Additional SumSub endpoints (document upload, AML screening, business verification) can be added as needed.
