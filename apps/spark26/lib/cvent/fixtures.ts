// Dev-only Cvent fixture. When the confirmation number is `banana` and we're
// not in production, the orders/transactions adapters short-circuit instead of
// hitting the real Cvent API — so local dev + demos work without real Cvent
// credentials or a real attendee on the mock event.

import type { CventOrder } from "./orders.js";

export const FAKE_CONFIRMATION = "banana";
export const FAKE_ATTENDEE_ID = "banana-attendee";
export const FAKE_ORDER_ID = "banana-order";

export function shouldUseFixture(confirmation: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return confirmation === FAKE_CONFIRMATION;
}

export function isFixtureAttendee(attendeeId: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return attendeeId === FAKE_ATTENDEE_ID;
}

export function fakeCventOrder(): CventOrder {
  return {
    id: FAKE_ORDER_ID,
    number: FAKE_CONFIRMATION,
    amountDue: "0.05",
    amountPaid: "0",
    amountOrdered: "0.05",
    currency: "USD",
    cancelled: false,
    attendee: {
      id: FAKE_ATTENDEE_ID,
      firstName: "Banana",
      lastName: "Tester",
    },
  };
}
