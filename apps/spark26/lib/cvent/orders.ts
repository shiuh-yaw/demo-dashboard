import { cventSdk } from "./client.js";
import { env } from "@/lib/env";
import { fakeCventOrder, shouldUseFixture } from "./fixtures.js";

const SAFE_CONFIRMATION = /^[A-Za-z0-9]{1,32}$/;

export type CventOrder = {
  id?: string;
  number?: string;
  amountDue?: string | number;
  amountPaid?: string | number;
  amountOrdered?: string | number;
  currency?: string;
  cancelled?: boolean;
  attendee?: { id: string; firstName?: string; lastName?: string };
};

type AttendeeResult = {
  id?: string;
  contact?: { firstName?: string; lastName?: string };
};

// The user-facing confirmation number identifies an attendee, not an order.
// Cvent's /events/{id}/orders filter does not accept `number` as a field, so
// we can't look up an order directly. The flow is:
//   1. /attendees?filter=confirmationNumber eq '<conf>' and event.id eq '<ev>'
//   2. /events/{ev}/orders?filter=attendee.id eq '<attendeeId>'
// An attendee may have 0, 1, or N orders — we take the first for the SPARK26
// deposit flow, which expects one deposit order per registration.
export async function getOrderByNumber(
  number: string
): Promise<CventOrder | null> {
  if (!SAFE_CONFIRMATION.test(number)) {
    throw new Error(`invalid confirmation number: ${number.slice(0, 4)}…`);
  }
  if (shouldUseFixture(number)) return fakeCventOrder();

  const sdk = cventSdk();
  const eventId = env.CVENT_EVENT_ID;

  const attendeePage = await sdk.attendees.listAttendees({
    filter: `confirmationNumber eq '${number}' and event.id eq '${eventId}'`,
    limit: 1,
  });
  const attendee = (
    attendeePage as { result?: { data?: AttendeeResult[] } }
  ).result?.data?.[0];
  if (!attendee?.id) return null;

  const orderPage = await sdk.events.getOrders({
    id: eventId,
    filter: `attendee.id eq '${attendee.id}'`,
    limit: 1,
  });
  const order = (orderPage as { result?: { data?: CventOrder[] } }).result
    ?.data?.[0];
  if (!order) return null;

  // /events/{id}/orders only returns attendee.id; views need the name.
  return {
    ...order,
    attendee: {
      id: attendee.id,
      firstName: attendee.contact?.firstName,
      lastName: attendee.contact?.lastName,
    },
  };
}
