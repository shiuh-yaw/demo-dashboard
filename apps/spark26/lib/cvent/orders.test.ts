import { describe, it, expect, vi, beforeEach } from "vitest";

const listAttendeesMock = vi.fn();
const getOrdersMock = vi.fn();

vi.mock("./client.js", () => ({
  cventSdk: () => ({
    events: { getOrders: getOrdersMock },
    attendees: { listAttendees: listAttendeesMock },
  }),
}));
vi.mock("@/lib/env", () => ({ env: { CVENT_EVENT_ID: "ev-1" } }));

beforeEach(() => {
  listAttendeesMock.mockReset();
  getOrdersMock.mockReset();
});

describe("getOrderByNumber", () => {
  it("resolves confirmation → attendee → order and merges the attendee name", async () => {
    listAttendeesMock.mockResolvedValue({
      result: {
        data: [
          {
            id: "att-1",
            contact: { firstName: "Jason", lastName: "Allegrante" },
          },
        ],
      },
    });
    getOrdersMock.mockResolvedValue({
      result: {
        data: [{ id: "o1", number: "P2NWPZ3LG2K", amountDue: 10 }],
      },
    });

    const { getOrderByNumber } = await import("./orders.js");
    const order = await getOrderByNumber("ABC123");

    expect(order).toMatchObject({
      id: "o1",
      number: "P2NWPZ3LG2K",
      attendee: { id: "att-1", firstName: "Jason", lastName: "Allegrante" },
    });
    expect(listAttendeesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: "confirmationNumber eq 'ABC123' and event.id eq 'ev-1'",
        limit: 1,
      })
    );
    expect(getOrdersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ev-1",
        filter: "attendee.id eq 'att-1'",
        limit: 1,
      })
    );
  });

  it("returns null when no attendee matches the confirmation number", async () => {
    listAttendeesMock.mockResolvedValue({ result: { data: [] } });
    const { getOrderByNumber } = await import("./orders.js");
    expect(await getOrderByNumber("NOPE")).toBeNull();
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("returns null when the attendee exists but has no order", async () => {
    listAttendeesMock.mockResolvedValue({
      result: { data: [{ id: "att-2", contact: {} }] },
    });
    getOrdersMock.mockResolvedValue({ result: { data: [] } });
    const { getOrderByNumber } = await import("./orders.js");
    expect(await getOrderByNumber("ABC123")).toBeNull();
  });

  it("rejects confirmation numbers with suspicious characters", async () => {
    const { getOrderByNumber } = await import("./orders.js");
    await expect(getOrderByNumber("'; DROP TABLE")).rejects.toThrow(/invalid/i);
    expect(listAttendeesMock).not.toHaveBeenCalled();
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("returns the banana fixture without hitting Cvent in non-production", async () => {
    const { getOrderByNumber } = await import("./orders.js");
    const order = await getOrderByNumber("banana");
    expect(order?.number).toBe("banana");
    expect(order?.attendee?.id).toBe("banana-attendee");
    expect(order?.amountDue).toBe("0.05");
    expect(order?.currency).toBe("USD");
    expect(listAttendeesMock).not.toHaveBeenCalled();
    expect(getOrdersMock).not.toHaveBeenCalled();
  });
});
