import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifySumsubSignature,
  normalizeSumsubEvent,
} from "../webhooks";
import type { SumsubWebhookPayload } from "../types";

describe("verifySumsubSignature", () => {
  const SECRET = "webhook_secret_key";

  function sign(body: string): string {
    return createHmac("sha256", SECRET).update(body).digest("hex");
  }

  it("returns true for valid signature", () => {
    const body = '{"applicantId":"app_1","type":"applicantReviewed"}';
    const digest = sign(body);
    expect(verifySumsubSignature(body, digest, SECRET)).toBe(true);
  });

  it("returns false for tampered body", () => {
    const body = '{"applicantId":"app_1","type":"applicantReviewed"}';
    const digest = sign(body);
    const tampered = body.replace("app_1", "app_2");
    expect(verifySumsubSignature(tampered, digest, SECRET)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const body = '{"type":"applicantCreated"}';
    const digest = sign(body);
    expect(verifySumsubSignature(body, digest, "wrong_secret")).toBe(false);
  });

  it("returns false for empty digest", () => {
    expect(verifySumsubSignature("body", "", SECRET)).toBe(false);
  });

  it("returns false for empty secret", () => {
    expect(verifySumsubSignature("body", "abc", "")).toBe(false);
  });

  it("returns false for non-hex digest", () => {
    expect(verifySumsubSignature("body", "not-hex!", SECRET)).toBe(false);
  });

  it("works with Buffer input", () => {
    const body = Buffer.from('{"type":"applicantPending"}');
    const digest = sign(body.toString());
    expect(verifySumsubSignature(body, digest, SECRET)).toBe(true);
  });
});

describe("normalizeSumsubEvent", () => {
  it("normalizes an applicantReviewed GREEN event", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_1",
      type: "applicantReviewed",
      reviewStatus: "completed",
      reviewResult: { reviewAnswer: "GREEN" },
      createdAtMs: "1700000000000",
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.id).toBe("app_1");
    expect(event.type).toBe("sumsub.applicantReviewed");
    expect(event.resource).toBe("applicant");
    expect(event.resource_id).toBe("app_1");
    expect(event.state).toBe("approved");
    expect(event.provider_status).toBe("completed");
    expect(event.provider).toBe("sumsub");
    expect(event.occurred_at).toBe("2023-11-14T22:13:20.000Z");
  });

  it("normalizes an applicantReviewed RED event", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_2",
      type: "applicantReviewed",
      reviewStatus: "completed",
      reviewResult: {
        reviewAnswer: "RED",
        rejectLabels: ["FORGERY"],
        reviewRejectType: "FINAL",
      },
      createdAtMs: "1700000000000",
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.state).toBe("rejected");
  });

  it("normalizes an applicantPending event", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_3",
      type: "applicantPending",
      reviewStatus: "pending",
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.state).toBe("pending");
  });

  it("normalizes an applicantOnHold event", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_4",
      type: "applicantOnHold",
      reviewStatus: "onHold",
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.state).toBe("on_hold");
  });

  it("normalizes an applicantCreated event", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_5",
      type: "applicantCreated",
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.state).toBe("created");
  });

  it("normalizes an applicantReset event", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_6",
      type: "applicantReset",
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.state).toBe("reset");
  });

  it("uses correlationId as event id when present", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_7",
      correlationId: "corr_123",
      type: "applicantReviewed",
      reviewResult: { reviewAnswer: "GREEN" },
    };
    const event = normalizeSumsubEvent(payload);
    expect(event.id).toBe("corr_123");
    expect(event.resource_id).toBe("app_7");
  });

  it("falls back to current time when createdAtMs is missing", () => {
    const payload: SumsubWebhookPayload = {
      applicantId: "app_8",
      type: "applicantCreated",
    };
    const before = Date.now();
    const event = normalizeSumsubEvent(payload);
    const after = Date.now();
    const eventTime = new Date(event.occurred_at).getTime();
    expect(eventTime).toBeGreaterThanOrEqual(before);
    expect(eventTime).toBeLessThanOrEqual(after);
  });
});
