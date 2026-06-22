---
name: sumsub
description: Use when the user needs to integrate SumSub — KYC/identity verification, applicant management, SDK access tokens, share tokens for reliance KYC, webhook verification, and Iron token sharing. Triggers on "sumsub", "kyc verification", "identity verification", "share token", "reliance kyc", "sumsub token sharing", "sumsub iron", "@dynamic-demos/sumsub".
---

# SumSub

## Where to look first

1. **Local wrapper:** `packages/sumsub/` — read its `AGENTS.md` for public surface. Dashboard-side only (D-003); demo apps never import it.
2. **Authoritative docs:** https://docs.sumsub.com/
3. **OpenAPI spec:** https://api.sumsub.com/openapi.json
4. **LLM docs:** https://docs.sumsub.com/llms.txt
5. **Authentication:** https://docs.sumsub.com/reference/authentication
6. **Webhooks:** https://docs.sumsub.com/docs/webhooks
7. **Agent skills repo:** https://github.com/SumSubstance/agent-skills

## The client and its public surface

```typescript
import { createSumsubClient } from "@dynamic-demos/sumsub";

const client = createSumsubClient({
  appToken: process.env.SUMSUB_APP_TOKEN!,   // sandbox: starts with sbx:
  secretKey: process.env.SUMSUB_SECRET_KEY!,
  env: "sandbox",  // default; same base URL for both modes
});

// Applicant management
const applicant = await client.createApplicant({
  externalUserId: "user_123",
  levelName: "basic-kyc-level",
  info: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
});
const fetched = await client.getApplicant(applicant.id);
const byExtId = await client.getApplicantByExternalId("user_123");
const status = await client.getApplicantStatus(applicant.id);

// SDK access token (for client-side WebSDK)
const sdkToken = await client.generateAccessToken({
  userId: applicant.id,
  levelName: "basic-kyc-level",
  ttlInSecs: 600,  // optional, default 600
});

// Share token (for reliance KYC / Iron token sharing)
const shareToken = await client.generateShareToken({
  applicantId: applicant.id,
  levelName: "basic-kyc-level",  // optional
});

// Consume a share token (receiving side)
const preview = await client.previewReuseIdentity({
  shareToken: shareToken.token,
  levelName: "basic-kyc-level",
});
const reused = await client.reuseIdentity({
  shareToken: shareToken.token,
  levelName: "basic-kyc-level",
  userId: "ext_user_on_receiving_account",  // optional
});

// Sandbox
await client.resetApplicant(applicant.id);
```

## Authentication (HMAC-SHA256 App Token signing)

Every request requires three headers signed with the secret key:

| Header | Value |
|---|---|
| `X-App-Token` | The app token, verbatim |
| `X-App-Access-Ts` | Unix epoch seconds (UTC), within ±60s of SumSub's clock |
| `X-App-Access-Sig` | `hex(hmac_sha256(secret, signingString))` |

Signing string (no separators): `<ts><METHOD><path_with_query><body_or_empty>`

The `signRequest()` export handles this automatically. Use it if you need to make custom API calls.

```typescript
import { signRequest } from "@dynamic-demos/sumsub";

const headers = signRequest(appToken, secretKey, "GET", "/resources/applicants/abc/one");
const res = await fetch(`https://api.sumsub.com/resources/applicants/abc/one`, {
  method: "GET",
  headers,
});
```

## Webhook verification

SumSub signs webhooks with HMAC-SHA256 of the raw body. The digest is in the `x-payload-digest` header.

```typescript
import { verifySumsubSignature, normalizeSumsubEvent, SUMSUB_DIGEST_HEADER } from "@dynamic-demos/sumsub";

// In your webhook handler:
const digest = request.headers.get(SUMSUB_DIGEST_HEADER);
const rawBody = await request.text();

if (!verifySumsubSignature(rawBody, digest, process.env.SUMSUB_WEBHOOK_SECRET!)) {
  return new Response("Forbidden", { status: 403 });
}

const payload = JSON.parse(rawBody);
const event = normalizeSumsubEvent(payload);
// event.state is one of: "approved", "rejected", "pending", "on_hold", "created", "reset"
```

### Webhook event types

| SumSub type | Canonical state | Meaning |
|---|---|---|
| `applicantReviewed` + GREEN | `approved` | Verification passed |
| `applicantReviewed` + RED | `rejected` | Verification failed |
| `applicantPending` | `pending` | Awaiting review |
| `applicantOnHold` | `on_hold` | Paused for manual review |
| `applicantCreated` | `created` | Applicant created |
| `applicantReset` | `reset` | Verification reset |

## Iron token sharing (reliance KYC)

The primary cross-provider use case: share SumSub KYC data with Iron to skip re-verification.

### Flow

```
1. User completes KYC in SumSub (your account)
2. Generate share token:      sumsub.generateShareToken({ applicantId })
3. Build Iron request body:   buildIronTokenIdentification({ token, intended_use })
4. Pass to Iron:              ironClient.kyc.startWithToken({ customer_id, ...body })
5. Check response:            requiresUserAction(response) → redirect if needed
```

### Code example

```typescript
import { createSumsubClient, buildIronTokenIdentification, requiresUserAction } from "@dynamic-demos/sumsub";
import { createIronClient } from "@dynamic-demos/iron";

const sumsub = createSumsubClient({
  appToken: process.env.SUMSUB_APP_TOKEN!,
  secretKey: process.env.SUMSUB_SECRET_KEY!,
});

const iron = createIronClient({
  apiKey: process.env.IRON_API_KEY!,
  env: "sandbox",
});

// Step 1: Generate share token from SumSub
const shareToken = await sumsub.generateShareToken({
  applicantId: "sumsub_applicant_id",
});

// Step 2: Build Iron identification request
const body = buildIronTokenIdentification({
  token: shareToken.token,
  intended_use: "PurchaseDigitalAssets",
  ip_address: "203.0.113.42",  // optional
});

// Step 3: Submit to Iron
const result = await iron.kyc.startWithToken({
  customer_id: "iron_customer_id",
  ...body,
});

// Step 4: Handle response
if (requiresUserAction(result)) {
  // Redirect user to result.url to complete missing KYC steps
  console.log("User must complete:", result.url);
} else if (result.status === "Approved") {
  // KYC data accepted — user is verified on Iron
  console.log("Verified!");
}
```

### Iron intended_use values

| Value | Description |
|---|---|
| `Investing` | Investment purposes |
| `PaymentToFriendsFamilyorOthers` | Peer-to-peer payments |
| `PurchaseDigitalAssets` | Buying cryptocurrency |
| `OnlinePurchasesOfGoodsOrServices` | E-commerce |
| `Trading` | Trading activities |

### Iron identification response statuses

| Status | Meaning | Action |
|---|---|---|
| `Approved` | KYC data accepted | Proceed with autoramp |
| `Processed` | Data ingested, review pending | Poll or wait for webhook |
| `Pending` | Missing information | Redirect user to `response.url` |
| `Rejected` | KYC data rejected | Re-verify or contact support |

## Dashboard API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/sumsub/applicants` | POST | Create a SumSub applicant |
| `/api/sumsub/applicants/[id]` | GET | Get a SumSub applicant |
| `/api/sumsub/applicants/[id]/status` | GET | Get verification status |
| `/api/sumsub/access-token` | POST | Generate SDK access token for WebSDK |
| `/api/sumsub/share-token` | POST | Generate share token for Iron |
| `/api/sumsub/reuse-identity` | POST | Consume a share token |
| `/api/webhooks/sumsub` | POST | Webhook receiver (verify + normalize) |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `SUMSUB_APP_TOKEN` | Yes | Sandbox tokens start with `sbx:` |
| `SUMSUB_SECRET_KEY` | Yes | Shown once at token creation |
| `SUMSUB_WEBHOOK_SECRET` | For webhooks | Dashboard → Dev Space → Webhooks |
| `SUMSUB_ENVIRONMENT` | No | Defaults to `sandbox` (D-005) |

## Gotchas

- **Same base URL**: `https://api.sumsub.com` for both sandbox and production. The app token determines the mode.
- **Token visibility**: App token + secret are shown only once at creation. No recovery — only regeneration.
- **Share tokens are single-use**: Generate a new one for each Iron identification. Re-using returns an error.
- **Signing string has no separators**: `<ts><METHOD><path><body>` — no dots, no newlines.
- **Timestamp tolerance**: ±60 seconds. If your server clock drifts, requests will fail with 401.
- **Sandbox tokens cannot hit production**: A `sbx:` token against production data returns 401, and vice versa.
