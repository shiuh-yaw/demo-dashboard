/**
 * Pure file-validation logic for LogoField, split out from the "use client"
 * component so it is importable from plain node-environment vitest tests
 * (the dashboard test config has no DOM/jsdom environment).
 */

export const MAX_LOGO_BYTES = 512 * 1024;

/** Returns an error message when `file` is not an acceptable logo, else null. */
export function validateLogoFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) {
    return "Logo must be an image file";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be under 512 KB";
  }
  return null;
}
