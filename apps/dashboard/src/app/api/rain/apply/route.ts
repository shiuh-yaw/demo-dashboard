import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  createCardForUser,
  createUserApplication,
  type CreateUserApplicationRequest,
} from "@dynamic-demos/rain";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth, type AuthenticatedUser } from "@/lib/dynamic/dynamic-auth";
import { ValidationError } from "@/lib/errors";
import { getRainClient } from "@/lib/rain/client";

export const OPTIONS = corsOptions;

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().min(1),
  countryCode: z.string().min(2),
});

const applySchema = z.object({
  firstName: z.string().min(1),
  birthDate: z.string().min(1),
  nationalId: z.string().min(1),
  phoneNumber: z.string().min(1),
  address: addressSchema,
  occupation: z.string().min(1),
  annualSalary: z.string().min(1),
  accountPurpose: z.string().min(1),
  expectedMonthlyVolume: z.string().min(1),
  isTermsOfServiceAccepted: z.boolean(),
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const authedUser = user as AuthenticatedUser;
    const walletAddress = authedUser.verified_credentials?.find(
      (credential) => credential.wallet_provider === "embeddedWallet",
    )?.address;
    if (!walletAddress) {
      throw new ValidationError("No embedded wallet address found");
    }
    if (!authedUser.email) {
      throw new ValidationError("Email address is required");
    }

    const body = applySchema.parse(await req.json());

    const monthlyVolume = Number(body.expectedMonthlyVolume);
    if (!Number.isFinite(monthlyVolume) || monthlyVolume <= 0) {
      throw new ValidationError(
        "expectedMonthlyVolume must be a positive number",
      );
    }

    // Demo policy: US applicant, auto-approved, static demo IP (matches the
    // OSS reference). lastName "Approved" is Rain's sandbox auto-approve hook.
    const payload: CreateUserApplicationRequest = {
      firstName: body.firstName,
      lastName: "Approved",
      birthDate: body.birthDate,
      nationalId: body.nationalId.replace(/\D/g, ""),
      countryOfIssue: "US",
      email: authedUser.email,
      phoneCountryCode: "1",
      phoneNumber: body.phoneNumber.replace(/\D/g, ""),
      address: {
        line1: body.address.line1,
        line2: body.address.line2,
        city: body.address.city,
        region: body.address.region,
        postalCode: body.address.postalCode,
        countryCode: body.address.countryCode,
      },
      walletAddress,
      ipAddress: "192.168.1.1",
      occupation: body.occupation,
      annualSalary: body.annualSalary,
      accountPurpose: body.accountPurpose,
      expectedMonthlyVolume: body.expectedMonthlyVolume,
      isTermsOfServiceAccepted: body.isTermsOfServiceAccepted,
    };

    const client = getRainClient();
    const application = await createUserApplication(client, payload);
    const card = await createCardForUser(client, application.id, {
      type: "virtual",
      limit: {
        frequency: "per30DayPeriod",
        amount: monthlyVolume,
      },
    });

    // The app (not the dashboard) persists `card` to Dynamic user metadata
    // (hard rule 2). We return it for the app to store.
    return createResponse({ card });
  } catch (error) {
    return handleApiError(error, "rain/apply");
  }
});
