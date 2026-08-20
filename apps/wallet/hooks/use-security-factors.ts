"use client";

/** Registered second factors (TOTP devices and passkeys) as one flat list. */

import { useQuery } from "@tanstack/react-query";
import { getMfaDevices, getPasskeys } from "@/lib/dynamic";

export interface SecurityFactor {
  key: string;
  kind: "passkey" | "mfa";
  label: string;
  meta: string;
  pending: boolean;
}

/** Coarse browser name from a UA string, to tell two passkeys apart. */
function browserName(userAgent?: string): string {
  if (!userAgent) return "";
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  return "";
}

export function useSecurityFactors({ enabled = true } = {}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["security-factors"],
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<SecurityFactor[]> => {
      const [devices, passkeys] = await Promise.all([
        getMfaDevices(),
        getPasskeys(),
      ]);
      const added = (date?: Date) =>
        date ? `Added ${new Date(date).toLocaleDateString()}` : "";
      return [
        ...devices.map((device, index) => ({
          key: device.id ?? `device-${index}`,
          kind: "mfa" as const,
          label:
            device.type === "totp"
              ? "Authenticator app"
              : (device.type ?? "MFA device"),
          meta: added(device.createdAt),
          pending: device.verified === false,
        })),
        // Deliberately not `alias`: Dynamic fills it with the credential id,
        // so it renders as a wall of base64.
        ...passkeys.map((passkey) => ({
          key: passkey.id,
          kind: "passkey" as const,
          label: "Passkey",
          // Two passkeys registered the same day are otherwise identical,
          // which is no basis for choosing which one to delete.
          meta: [browserName(passkey.userAgent), added(passkey.createdAt)]
            .filter(Boolean)
            .join(" · "),
          pending: false,
        })),
      ];
    },
  });

  return { factors: data, isLoading };
}
