import { describe, expect, it } from "vitest";
import { MAX_LOGO_BYTES, validateLogoFile } from "@/components/shared/logo-field-validation";

describe("validateLogoFile", () => {
  it("accepts an image under the size limit", () => {
    expect(
      validateLogoFile({ type: "image/png", size: 1024 }),
    ).toBeNull();
  });

  it("accepts an image exactly at the size limit", () => {
    expect(
      validateLogoFile({ type: "image/svg+xml", size: MAX_LOGO_BYTES }),
    ).toBeNull();
  });

  it("rejects a non-image file", () => {
    expect(
      validateLogoFile({ type: "application/pdf", size: 1024 }),
    ).toBe("Logo must be an image file");
  });

  it("rejects an image over the size limit", () => {
    expect(
      validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 }),
    ).toBe("Logo must be under 512 KB");
  });
});
