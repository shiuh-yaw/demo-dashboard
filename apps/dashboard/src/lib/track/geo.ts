/**
 * Derive coarse geo from Vercel's request geo headers. Pure function -
 * never throws, missing headers just resolve to `undefined` fields.
 */

export interface DerivedGeo {
  country?: string;
  region?: string;
  city?: string;
}

export function deriveGeo(headers: Headers): DerivedGeo {
  const country = headers.get("x-vercel-ip-country") ?? undefined;
  const region = headers.get("x-vercel-ip-country-region") ?? undefined;
  const rawCity = headers.get("x-vercel-ip-city");

  let city: string | undefined;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  return { country, region, city };
}
