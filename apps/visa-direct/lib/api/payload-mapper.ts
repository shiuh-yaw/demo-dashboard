/**
 * Visa Direct → Fireblocks Payload Mapper
 *
 * Maps a Visa Direct sendPayout request to a Fireblocks Trading Orders API
 * (POST /v1/trading/orders) request. This mapping is a key demo talking point
 * for Visa Direct partners.
 *
 * Field mapping (Visa Direct → Fireblocks Orders API):
 *
 *   recipientDetail.firstName + lastName          → note
 *   recipientDetail.cryptoWallet.address          → settlement.destinationAccount.address
 *   recipientDetail.cryptoWallet.blockchain       → quoteAssetId prefix
 *     "ETHEREUM" → USDC_ETH_...
 *     "SOLANA"   → USDC_SOL_...
 *   transactionDetail.transactionAmount           → executionRequestDetails.baseAmount
 *   transactionDetail.clientReferenceId           → customerInternalReferenceId
 *
 * Unmapped Visa Direct fields (no Fireblocks Orders API equivalent):
 *   senderDetail.senderReferenceNumber            — Visa-side sender ref only
 *   transactionDetail.endToEndId                  — payment network E2E ID
 *   recipientDetail.address (physical)            — not required for crypto settlement
 *   senderDetail.address (physical)               — not required
 *   recipientDetail.type / senderDetail.type      — KYC classification, Visa-side only
 *   recipientDetail.cryptoWallet.tag              — memo/tag for Stellar/XRP; N/A for ETHEREUM
 */

/** Physical address sub-type used on both recipient and sender. */
export interface VisaDirectAddress {
  country: string;
  city: string;
  postalCode: string;
  addressLine1: string;
  state: string;
}

/**
 * Visa Direct sendPayout request payload.
 * Matches the real Visa Direct Push-to-Wallet API schema.
 */
export interface VisaDirectPayoutRequest {
  recipientDetail: {
    firstName: string;
    lastName: string;
    /** "I" = Individual, "B" = Business */
    type: "I" | "B";
    address: VisaDirectAddress;
    cryptoWallet: {
      /** All-caps blockchain name, e.g. "ETHEREUM", "SOLANA" */
      blockchain: string;
      address: string;
      asset: string;
      /** Memo/tag — applicable for Stellar, XRP etc.; empty string for Ethereum */
      tag?: string;
    };
  };
  senderDetail: {
    firstName: string;
    lastName: string;
    senderReferenceNumber: string;
    /** "I" = Individual, "B" = Business */
    type: "I" | "B";
    address: VisaDirectAddress;
  };
  /** "CW" = Crypto Wallet payout method */
  payoutMethod: string;
  transactionDetail: {
    transactionAmount: number;
    /** ISO 4217 currency code, e.g. "USD" */
    transactionCurrencyCode: string;
    /** End-to-end ID assigned by the payment network */
    endToEndId: string;
    /** Merchant/platform reference ID — maps to Fireblocks customerInternalReferenceId */
    clientReferenceId: string;
  };
}

/** Fireblocks Trading Orders API request (POST /v1/trading/orders). */
export interface FireblocksOrderRequest {
  via: {
    type: "PROVIDER_ACCOUNT";
    /** Connected MTLco exchange account ID */
    accountId: string;
    /** "FIREBLOCKS_TESTNET" on testnet, "FIREBLOCKS" on mainnet */
    providerId: string;
  };
  executionRequestDetails: {
    type: "MARKET";
    /** SELL: give USD (base), receive USDC (quote) */
    side: "SELL";
    /** USD amount as string, sourced from transactionDetail.transactionAmount */
    baseAmount: string;
    baseAssetId: "USD";
    /** Target asset, e.g. "USDC_ETH_TEST5_0GER" */
    quoteAssetId: string;
  };
  settlement: {
    type: "PREFUNDED";
    destinationAccount: {
      type: "ONE_TIME_ADDRESS";
      /** Recipient wallet — from recipientDetail.cryptoWallet.address */
      address: string;
    };
  };
  /** From transactionDetail.clientReferenceId */
  customerInternalReferenceId?: string;
  /** Recipient display name — from recipientDetail.firstName + lastName */
  note?: string;
}

/**
 * Maps a Visa Direct blockchain name (uppercase) to a Fireblocks asset ID prefix.
 *
 * @param blockchain - Visa Direct blockchain name, e.g. "ETHEREUM", "SOLANA"
 * @param asset      - Visa Direct asset name, e.g. "USDC"
 * @param testnet    - When true, appends testnet suffix
 */
export function mapBlockchainToAssetId(
  blockchain: string,
  asset: string,
  testAssetId?: string,
): string {
  if (testAssetId) return testAssetId;
  const assetUpper = asset.toUpperCase();
  switch (blockchain.toUpperCase()) {
    case "ETHEREUM":
      return `${assetUpper}_ETH`;
    case "SOLANA":
      return `${assetUpper}_SOL`;
    default:
      return `${assetUpper}_ETH`;
  }
}

/**
 * Builds a structured note string carrying Travel Rule–relevant originator and
 * beneficiary data. This is the primary extension point in the Fireblocks
 * Trading Orders API for passing KYC/Travel Rule metadata alongside the order.
 *
 * In production, Fireblocks' compliance integration (Notabene / Elliptic)
 * screens the downstream settlement transaction automatically at the workspace
 * level. This note ensures the data is human-readable in the Fireblocks UI and
 * available for any downstream audit trail.
 *
 * Format (pipe-delimited for readability in Fireblocks transaction notes):
 *   BEN: <name> | <address> | <blockchain>/<asset>
 *   OGN: <name> | <senderRef>
 *   REF: <clientReferenceId> | E2E: <endToEndId>
 */
export function buildTravelRuleNote(visaRequest: VisaDirectPayoutRequest): string {
  const { recipientDetail, senderDetail, transactionDetail } = visaRequest;
  const ben = `${recipientDetail.firstName} ${recipientDetail.lastName}`;
  const wallet = `${recipientDetail.cryptoWallet.address} (${recipientDetail.cryptoWallet.blockchain}/${recipientDetail.cryptoWallet.asset})`;
  const ogn = `${senderDetail.firstName} ${senderDetail.lastName}`;

  return [
    `BEN: ${ben} | ${wallet}`,
    `OGN: ${ogn} | ref ${senderDetail.senderReferenceNumber}`,
    `REF: ${transactionDetail.clientReferenceId} | E2E: ${transactionDetail.endToEndId}`,
  ].join(" || ");
}

/**
 * Maps a Visa Direct sendPayout request to a Fireblocks Trading Orders request.
 *
 * Only the fields strictly required to settle the order are propagated:
 * recipient wallet address, base amount, and client reference ID. PII-style
 * fields (names, physical addresses) are intentionally excluded from the
 * Fireblocks call — if a caller needs to attach a Travel Rule note, they
 * must construct it with real (not demo/mock) data and pass it via
 * `options.note`.
 *
 * @param visaRequest  - The Visa Direct sendPayout payload (source of truth
 *                       for wallet address, amount, and reference ID only)
 * @param accountId    - Fireblocks connected MTLco account ID
 * @param providerId   - Fireblocks provider ID ("FIREBLOCKS_TESTNET" or
 *                       "FIREBLOCKS")
 * @param quoteAssetId - Explicit asset ID (e.g. "USDC_ETH_TEST5_0GER")
 * @param options.note - Optional human-readable note (Travel Rule / audit).
 *                       Callers are responsible for making sure this does
 *                       not contain mock/demo data.
 */
export function mapVisaDirectToFireblocksOrder(
  visaRequest: VisaDirectPayoutRequest,
  accountId: string,
  providerId: string,
  quoteAssetId: string,
  options?: { note?: string },
): FireblocksOrderRequest {
  const { recipientDetail, transactionDetail } = visaRequest;

  return {
    via: {
      type: "PROVIDER_ACCOUNT",
      accountId,
      providerId,
    },
    executionRequestDetails: {
      type: "MARKET",
      side: "SELL",
      baseAmount: String(transactionDetail.transactionAmount),
      baseAssetId: "USD",
      quoteAssetId,
    },
    settlement: {
      type: "PREFUNDED",
      destinationAccount: {
        type: "ONE_TIME_ADDRESS",
        address: recipientDetail.cryptoWallet.address,
      },
    },
    customerInternalReferenceId: transactionDetail.clientReferenceId,
    ...(options?.note ? { note: options.note } : {}),
  };
}
