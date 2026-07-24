/**
 * Clean a stored website value to a bare display host: drop protocol, "www.",
 * and any path/query/hash, lowercased. Display-only - the full URL stays the
 * stored value and link target. Returns "" when there is nothing to show.
 */
export function displayHost(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.length === 0) return "";
  const withoutProtocol = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = (withoutProtocol.split(/[/?#]/)[0] ?? "").trim().toLowerCase();
  const cleaned = host.replace(/^www\./, "");
  return cleaned.length > 0 ? cleaned : "";
}
