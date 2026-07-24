"use client";

import { X } from "lucide-react";
import type { TransactionRecord } from "@/lib/transactions/server";

interface ApiPayloadDrawerProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
}

/** Build the Visa Direct sendPayout payload for a given transaction. */
function buildVisaPayload(tx: TransactionRecord) {
  const amountNum = parseFloat(tx.amount);
  return {
    recipientDetail: {
      firstName: "Sarah",
      lastName: "Chen",
      type: "I",
      address: {
        country: "USA",
        city: "San Francisco",
        postalCode: "94102",
        addressLine1: "123 Market St",
        state: "CA",
      },
      cryptoWallet: {
        blockchain: tx.blockchain.toUpperCase(),
        address: tx.recipientWallet,
        asset: tx.asset,
        tag: "",
      },
    },
    senderDetail: {
      firstName: "Airbnb",
      lastName: "Inc",
      senderReferenceNumber: tx.visaDirectTxId,
      type: "B",
      address: {
        country: "USA",
        city: "San Francisco",
        postalCode: "94103",
        addressLine1: "888 Brannan St",
        state: "CA",
      },
    },
    payoutMethod: "CW",
    transactionDetail: {
      transactionAmount: isNaN(amountNum) ? parseFloat(String(tx.amount)) : amountNum,
      transactionCurrencyCode: "USD",
      endToEndId: crypto.randomUUID(),
      clientReferenceId: tx.visaDirectTxId,
    },
  };
}

/** Build the Fireblocks Orders API payload for a given transaction. */
function buildFireblocksPayload(tx: TransactionRecord, visaPayload: ReturnType<typeof buildVisaPayload>) {
  const ben = `${visaPayload.recipientDetail.firstName} ${visaPayload.recipientDetail.lastName}`;
  const wallet = `${tx.recipientWallet} (${tx.blockchain.toUpperCase()}/${tx.asset})`;
  const note = [
    `BEN: ${ben} | ${wallet}`,
    `OGN: Airbnb Inc | ref ${tx.visaDirectTxId}`,
    `REF: ${visaPayload.transactionDetail.clientReferenceId} | E2E: ${visaPayload.transactionDetail.endToEndId}`,
  ].join(" || ");

  return {
    via: {
      type: "PROVIDER_ACCOUNT",
      accountId: "cdf863ee-f6cd-4d9e-83ae-12f13ba29534",
      providerId: "FIREBLOCKS_TESTNET",
    },
    executionRequestDetails: {
      type: "MARKET",
      side: "SELL",
      baseAmount: tx.amount,
      baseAssetId: "USD",
      quoteAssetId: "USDC_ETH_TEST5_0GER",
    },
    settlement: {
      type: "PREFUNDED",
      destinationAccount: {
        type: "ONE_TIME_ADDRESS",
        address: tx.recipientWallet,
      },
    },
    customerInternalReferenceId: tx.visaDirectTxId,
    // Travel Rule: originator + beneficiary encoded for audit trail.
    // Fireblocks compliance screening (Notabene/Elliptic) additionally
    // processes the settlement transaction at the workspace level.
    note,
  };
}

interface JsonPanelProps {
  title: string;
  subtitle: string;
  data: object;
  accentVar: string;
}

function JsonPanel({ title, subtitle, data, accentVar }: JsonPanelProps) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      <div className="px-4 py-3 border-b border-(--brand-border)" style={{ backgroundColor: `var(${accentVar})` }}>
        <p className="text-xs font-semibold text-(--brand-fg)">{title}</p>
        <p className="text-[11px] text-(--brand-muted) mt-0.5">{subtitle}</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-[11px] leading-relaxed font-mono text-(--brand-fg) whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/**
 * Phase 4 — API payload drawer.
 *
 * Slides in from the right and shows the Visa Direct sendPayout request
 * alongside the mapped Fireblocks POST /v1/trading/orders payload
 * side-by-side. Key demo talking point for Visa Direct partners.
 */
export function ApiPayloadDrawer({ transaction, onClose }: ApiPayloadDrawerProps) {
  if (!transaction) return null;

  const visaPayload = buildVisaPayload(transaction);
  const fireblocksPayload = buildFireblocksPayload(transaction, visaPayload);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-3xl bg-(--brand-surface) shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--brand-border) shrink-0">
          <div>
            <h2
              id="drawer-title"
              className="text-sm font-semibold text-(--brand-fg)"
            >
              API payload
            </h2>
            <p className="text-xs text-(--brand-muted) mt-0.5">
              {transaction.visaDirectTxId} · {transaction.amount} {transaction.asset}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mapping label */}
        <div className="px-5 py-2.5 bg-(--brand-row-bg) border-b border-(--brand-border) shrink-0">
          <p className="text-xs text-(--brand-muted)">
            <span className="font-medium text-(--brand-fg)">MTLco</span>
            {" "}sendPayout  →  mapped to  → {" "}
            <span className="font-medium text-(--brand-fg)">Fireblocks</span>
            {" "}POST /v1/trading/orders
          </p>
        </div>

        {/* Side-by-side panels */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-(--brand-border)">
          <JsonPanel
            title="MTLco"
            subtitle="sendPayout request"
            data={visaPayload}
            accentVar="--brand-panel-blue-bg"
          />
          <JsonPanel
            title="Fireblocks"
            subtitle="POST /v1/trading/orders"
            data={fireblocksPayload}
            accentVar="--brand-panel-orange-bg"
          />
        </div>
      </div>
    </>
  );
}
