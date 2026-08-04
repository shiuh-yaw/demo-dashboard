import { describe, it, expect } from "vitest";
import { buildLeadBlocks } from "../notifier";
import type { Contact } from "@dynamic-demos/db";

const contact: Contact = {
  id: "c1",
  email: "well.goodman29@gmail.com",
  firstSeenAt: new Date("2026-07-30T07:35:37.141Z"),
  dynamicUserId: null,
  notifiedAt: null,
  lastSeenAt: new Date("2026-07-30T07:35:37.141Z"),
  sightingCount: 1,
};

describe("buildLeadBlocks", () => {
  it("renders intro + Email + Date, and Demo/Prospect when known", () => {
    const text = JSON.stringify(buildLeadBlocks(contact, "Wallet", "Acme Corp"));
    expect(text).toContain("New user tried our demo environment");
    expect(text).toContain("well.goodman29@gmail.com");
    expect(text).toContain("2026-07-30T07:35:37.141Z");
    expect(text).toContain("Wallet");
    expect(text).toContain("Acme Corp");
  });

  it("omits Demo and Prospect lines when unknown (no placeholders)", () => {
    const text = JSON.stringify(buildLeadBlocks(contact, null, null));
    expect(text).toContain("well.goodman29@gmail.com");
    expect(text).not.toContain("Demo:");
    expect(text).not.toContain("Prospect:");
  });
});
