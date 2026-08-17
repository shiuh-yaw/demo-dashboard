/**
 * Free/consumer email domains that must never be enriched to a "company" -
 * a personal gmail address is not a lead's employer. `isBusinessDomain`
 * gates the Phase GTM-10 enricher.
 */

const CONSUMER_DOMAINS = new Set<string>([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "pm.me",
]);

/** True when the domain looks like a company domain worth enriching. */
export function isBusinessDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (!d || !d.includes(".")) return false;
  return !CONSUMER_DOMAINS.has(d);
}
