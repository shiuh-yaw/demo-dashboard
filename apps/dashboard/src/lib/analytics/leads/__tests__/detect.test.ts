import { describe, it, expect } from "vitest";
import { detectLead } from "../detect";
import type { TrackBatch } from "@dynamic-demos/analytics";

type TrackEvent = TrackBatch["events"][number];

function batch(events: TrackEvent[], demoSlug = "wallet"): TrackBatch {
  return { sessionId: "s", anonId: "a", demoSlug, events };
}
const authed = (props: Record<string, unknown>): TrackEvent => ({
  eventId: "e",
  type: "milestone",
  name: "authenticated",
  ts: 1,
  props,
});

describe("detectLead", () => {
  it("returns the sighting for a valid authenticated email", () => {
    const r = detectLead(batch([authed({ email: "A@B.com", dynamicUserId: "d1" })]), { isInternal: false, prospectId: "p1" });
    expect(r).toEqual({ email: "a@b.com", dynamicUserId: "d1", demoSlug: "wallet", prospectId: "p1" });
  });
  it("returns null for internal sessions", () => {
    expect(detectLead(batch([authed({ email: "a@b.com" })]), { isInternal: true, prospectId: null })).toBeNull();
  });
  it("returns null for an id-only authenticated fire (no email)", () => {
    expect(detectLead(batch([authed({ dynamicUserId: "d1" })]), { isInternal: false, prospectId: null })).toBeNull();
  });
  it("returns null when there is no authenticated milestone", () => {
    expect(detectLead(batch([{ eventId: "e", type: "step", name: "demo_launch", ts: 1, props: {} }]), { isInternal: false, prospectId: null })).toBeNull();
  });
  it("guards non-string / malformed email", () => {
    expect(detectLead(batch([authed({ email: 123 })]), { isInternal: false, prospectId: null })).toBeNull();
    expect(detectLead(batch([authed({ email: "nope" })]), { isInternal: false, prospectId: null })).toBeNull();
  });
});
