import { z } from "zod";

/**
 * KYC application shape submitted to `/api/card/apply`. Field-for-field
 * match with the dashboard `/api/rain/apply` body (the app's own schema
 * must never be looser than what the dashboard accepts, or a valid-looking
 * submission would forward and bounce back as a 422) - ported from the OSS
 * `components/application/helpers.ts` `FormSchema`, trimmed of `lastName`
 * and `email` (those come from the authenticated identity, not user input).
 */

const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "State/region is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  countryCode: z.string().min(2, "Country code is required"),
});

export const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  birthDate: z
    .string()
    .min(1, "Birth date is required")
    .refine(
      (dateString) => {
        const birthDate = new Date(dateString);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge =
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ? age - 1
            : age;
        return adjustedAge >= 21;
      },
      { message: "You must be at least 21 years old to apply" },
    ),
  nationalId: z.string().min(1, "Social security number is required"),
  phoneNumber: z.string().min(4, "Phone number is required"),
  address: addressSchema,
  occupation: z.string().min(1, "Occupation is required"),
  annualSalary: z.string().min(1, "Annual salary is required"),
  accountPurpose: z.string().min(1, "Account purpose is required"),
  expectedMonthlyVolume: z.string().min(1, "Expected monthly volume is required"),
  isTermsOfServiceAccepted: z
    .boolean()
    .refine((v) => v, { message: "You must accept the Terms of Service" }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
