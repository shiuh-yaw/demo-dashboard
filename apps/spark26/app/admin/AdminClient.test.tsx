import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminClient from "./AdminClient.js";
import type { OrderState } from "@/lib/types/order-state";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const sampleOrders: OrderState[] = [
  {
    confirmationNumber: "AAA",
    status: "tx_confirmed",
    amountDue: "1.21",
    currency: "USD",
    attendeeName: "Alpha User",
    cventOrderId: "o-1",
    cventAttendeeId: "a-1",
    cventEventId: "ev-1",
    txHash: "0xabcdef0123456789",
    cventPostAttempts: 2,
    cventPostLastError: "500 Cvent",
    updatedAt: new Date().toISOString(),
    version: 1,
    settlementChain: "base",
    settlementAsset: "USDC",
    createdAt: new Date().toISOString(),
  } as OrderState,
  {
    confirmationNumber: "BBB",
    status: "paid",
    amountDue: "5.00",
    currency: "USD",
    attendeeName: "Beta User",
    cventOrderId: "o-2",
    cventAttendeeId: "a-2",
    cventEventId: "ev-1",
    txHash: "0x0011223344556677",
    cventTransactionId: "ctx-2",
    cventPostAttempts: 0,
    updatedAt: new Date().toISOString(),
    version: 1,
    settlementChain: "base",
    settlementAsset: "USDC",
    createdAt: new Date().toISOString(),
  } as OrderState,
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("AdminClient", () => {
  it("renders both rows in the All tab", () => {
    render(wrap(<AdminClient initialOrders={sampleOrders} />));
    expect(screen.getByText("AAA")).toBeDefined();
    expect(screen.getByText("BBB")).toBeDefined();
  });

  it("Stuck tab shows only tx_confirmed orders", () => {
    render(wrap(<AdminClient initialOrders={sampleOrders} />));
    fireEvent.click(screen.getByRole("button", { name: /stuck/i }));
    expect(screen.getByText("AAA")).toBeDefined();
    expect(screen.queryByText("BBB")).toBeNull();
  });

  it("Retry button fires POST /api/admin/retry/:confirmation", async () => {
    (fetch as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    render(wrap(<AdminClient initialOrders={sampleOrders} />));
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/retry/AAA",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("renders native amount with USD sublabel when FX fields are populated", () => {
    const orders: OrderState[] = [
      {
        confirmationNumber: "EURROW",
        status: "checkout_ready",
        amountDue: "50",
        currency: "EUR",
        amountDueUsd: "54.25",
        fxRate: "1.0850",
        fxSource: "coinbase",
        fxLockedAt: "2026-04-22T14:32:00.000Z",
        cventPostAttempts: 0,
        cventEventId: "ev",
        cventAttendeeId: "att",
        cventOrderId: "ord",
        version: 2,
        settlementChain: "base",
        settlementAsset: "USDC",
        createdAt: "2026-04-22T14:30:00.000Z",
        updatedAt: "2026-04-22T14:32:00.000Z",
      } as OrderState,
    ];
    render(wrap(<AdminClient initialOrders={orders} />));
    expect(screen.getByText("€50.00")).toBeDefined();
    expect(screen.getByText(/\$54\.25 USD @ 1\.0850/)).toBeDefined();
  });

  it("renders only the native amount when FX fields are absent", () => {
    const orders: OrderState[] = [
      {
        confirmationNumber: "USDROW",
        status: "checkout_ready",
        amountDue: "499.00",
        currency: "USD",
        cventPostAttempts: 0,
        cventEventId: "ev",
        cventAttendeeId: "att",
        cventOrderId: "ord",
        version: 1,
        settlementChain: "base",
        settlementAsset: "USDC",
        createdAt: "2026-04-22T14:30:00.000Z",
        updatedAt: "2026-04-22T14:30:00.000Z",
      } as OrderState,
    ];
    render(wrap(<AdminClient initialOrders={orders} />));
    expect(screen.getByText("$499.00")).toBeDefined();
    expect(screen.queryByText(/@/)).toBeNull();
  });
});
