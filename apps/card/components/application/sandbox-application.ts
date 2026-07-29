/**
 * Sandbox KYC application data - a valid sandbox identity (Jane, SSN
 * 123456789, etc.) that passes `applicationSchema`. Shared by the
 * "Prefill sample data" button in `application-form.tsx` and by
 * `useReissueCard` (`hooks/use-reissue-card.ts`), which submits it
 * silently to recreate a per-user card when the stored one is unresolvable.
 */

import type { ApplicationInput } from "./schema";

export const SANDBOX_APPLICATION: ApplicationInput = {
  firstName: "Jane",
  birthDate: "2000-04-20",
  nationalId: "123456789",
  phoneNumber: "5551234567",
  address: {
    line1: "123 Main Street",
    line2: "",
    city: "San Francisco",
    region: "CA",
    postalCode: "94105",
    countryCode: "US",
  },
  occupation: "11-3031",
  annualSalary: "120000",
  accountPurpose: "spending",
  expectedMonthlyVolume: "2500",
  isTermsOfServiceAccepted: true,
};
