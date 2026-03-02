/**
 * Iron Finance Bank Accounts API Route
 *
 * POST /api/iron/banks - Register a bank account
 *
 * Reference: https://docs.iron.xyz
 */

import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import {
  ironClient,
  type SimpleBankAccountRequest,
} from "@/lib/services/iron";
import { z } from "zod";

export const OPTIONS = corsOptions;

const registerBankAccountSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  currency: z.enum(["USD", "EUR", "GBP", "BRL", "MXN"]),
  account_holder_name: z.string().min(1, "Account holder name is required"),
  account_number: z.string().min(1, "Account number is required"),
  routing_number: z.string().optional(), // For ACH/Wire
  iban: z.string().optional(), // For SEPA
  swift_code: z.string().optional(),
  sort_code: z.string().optional(), // For UK
  bank_name: z.string().optional(),
  bank_address: z.string().optional(),
  label: z.string().optional(),
});

/**
 * POST /api/iron/banks
 * Register a new bank account for a customer
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate request body
    const validated = registerBankAccountSchema.parse(body);

    const bankRequest: SimpleBankAccountRequest = {
      customer_id: validated.customer_id,
      currency: validated.currency,
      account_holder_name: validated.account_holder_name,
      account_number: validated.account_number,
      routing_number: validated.routing_number,
      iban: validated.iban,
      swift_code: validated.swift_code,
      sort_code: validated.sort_code,
      bank_name: validated.bank_name,
      bank_address: validated.bank_address,
      label: validated.label,
    };

    const bankAccount = await ironClient.registerBankAccount(bankRequest);

    return createResponse(bankAccount, 201);
  } catch (error) {
    return handleApiError(error, "iron/banks/create");
  }
});
