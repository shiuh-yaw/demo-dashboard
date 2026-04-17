/**
 * Mock data for Visa Direct demo.
 * All typed TypeScript constants — never hardcode in components.
 */

export interface MockHost {
  name: string;
  email: string;
  hostSince: string;
  totalEarnings: number;
  pendingPayout: number;
  currency: string;
}

export interface MockPendingPayout {
  id: string;
  amount: number;
  currency: string;
  description: string;
  dueDate: string;
}

export interface MockBankAccount {
  bank: string;
  accountMasked: string;
  routingMasked: string;
  type: string;
  isDefault: boolean;
}

export interface MockCard {
  network: string;
  cardMasked: string;
  expiry: string;
  type: string;
  isDefault: boolean;
}

export interface MockTransaction {
  id: string;
  visaDirectTxId: string;
  amount: number;
  asset: string;
  blockchain: string;
  status: string;
  subStatus: string;
  recipientWallet: string;
  timestamp: string;
  fireblocksId: string;
}

export interface MockVisaPayload {
  recipientDetail: {
    firstName: string;
    lastName: string;
    type: string;
    address: {
      country: string;
      city: string;
      postalCode: string;
      addressLine1: string;
      state: string;
    };
    cryptoWallet: {
      blockchain: string;
      address: string;
      asset: string;
      tag: string;
    };
  };
  senderDetail: {
    firstName: string;
    lastName: string;
    senderReferenceNumber: string;
    type: string;
    address: {
      country: string;
      city: string;
      postalCode: string;
      addressLine1: string;
      state: string;
    };
  };
  payoutMethod: string;
  transactionDetail: {
    transactionAmount: number;
    transactionCurrencyCode: string;
    endToEndId: string;
    clientReferenceId: string;
  };
}

export const MOCK_HOST: MockHost = {
  name: "Sarah Chen",
  email: "sarah.chen@example.com",
  hostSince: "2019",
  totalEarnings: 48250,
  pendingPayout: 1840,
  currency: "USD",
};

export const MOCK_PENDING_PAYOUT: MockPendingPayout = {
  id: "PAY-2025-0041",
  amount: 1840,
  currency: "USD",
  description: "April earnings — 3 stays",
  dueDate: "2025-04-20",
};

export const MOCK_BANK_ACCOUNT: MockBankAccount = {
  bank: "Chase Bank",
  accountMasked: "****4521",
  routingMasked: "****021",
  type: "Checking",
  isDefault: true,
};

export const MOCK_CARD: MockCard = {
  network: "Visa",
  cardMasked: "****8823",
  expiry: "09/27",
  type: "Debit",
  isDefault: false,
};

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  {
    id: "TXN-001",
    visaDirectTxId: "VD-1713000001",
    amount: 1200,
    asset: "USDC",
    blockchain: "Ethereum",
    status: "EXECUTION_COMPLETED",
    subStatus: "PAYOUT_COMPLETED",
    recipientWallet: "0xAB...1234",
    timestamp: "2025-04-01T10:00:00Z",
    fireblocksId: "fb-tx-aaa111",
  },
  {
    id: "TXN-002",
    visaDirectTxId: "VD-1713000002",
    amount: 980,
    asset: "USDC",
    blockchain: "Ethereum",
    status: "EXECUTION_FAILED",
    subStatus: "WALLET_NOT_VERIFIED",
    recipientWallet: "0xCD...5678",
    timestamp: "2025-03-15T14:30:00Z",
    fireblocksId: "fb-tx-bbb222",
  },
];

export const MOCK_VISA_PAYLOAD_TEMPLATE: MockVisaPayload = {
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
      blockchain: "ETHEREUM",
      address: "0xbeFa010044579f400000230C14C62811ff8ed1fc",
      asset: "USDC",
      tag: "",
    },
  },
  senderDetail: {
    firstName: "Airbnb",
    lastName: "Inc",
    senderReferenceNumber: "AIRBNB-PAY-2025-0041",
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
    transactionAmount: 1840,
    transactionCurrencyCode: "USD",
    endToEndId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    clientReferenceId: "987399801024",
  },
};
