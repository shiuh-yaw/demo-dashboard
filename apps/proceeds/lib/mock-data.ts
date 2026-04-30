export const currentUser = {
  name: "Anne Johnson",
  email: "anne@examplecompany.com",
  company: "Example Company 1",
  vendorId: "#1234567",
  initials: "AJ",
};

/* ---------- Monthly proceeds (App Store Connect parity) ---------- */

export interface CountryProceeds {
  country: string;
  countryCode: string;
  units: number;
  localCurrency: string;
  earnedLocal: number;
  fxRate: number;
  proceedsUsdc: number;
}

export interface MonthlyProceeds {
  month: string; // "April 2026"
  monthKey: string; // "2026-04"
  status: "paid" | "estimated" | "carried_forward";
  totalUsdc: number;
  /** When status=paid, date the payment was issued. */
  issuedDate?: string;
  /** When status=estimated, date proceeds will be disbursed. */
  expectedDate?: string;
  /** On-chain settlement hash — stablecoin equivalent of Apple's CCI. */
  settlementHash?: string;
  /** Destination wallet label + truncated address. */
  destination: string;
  /** Per-country breakdown. */
  breakdown: CountryProceeds[];
}

/**
 * Demo fixture for a very small indie developer: each month's proceeds are a
 * few hundred dollars, small enough to fit in a single mint call to the
 * Dynamic USDC demo contract. Two months have already settled; the current
 * fiscal month is still accruing and can be pushed on-chain via the
 * "Pay out now" demo button.
 */
export const monthlyProceeds: MonthlyProceeds[] = [
  {
    month: "April 2026",
    monthKey: "2026-04",
    status: "estimated",
    totalUsdc: 7.5,
    expectedDate: "May 1, 2026",
    destination: "Stablecoin Wallet · 0x6602…0469",
    breakdown: [
      {
        country: "United States",
        countryCode: "US",
        units: 4,
        localCurrency: "USD",
        earnedLocal: 2.8,
        fxRate: 1.0,
        proceedsUsdc: 2.8,
      },
      {
        country: "United Kingdom",
        countryCode: "GB",
        units: 2,
        localCurrency: "GBP",
        earnedLocal: 1.1,
        fxRate: 1.272,
        proceedsUsdc: 1.4,
      },
      {
        country: "Germany",
        countryCode: "DE",
        units: 2,
        localCurrency: "EUR",
        earnedLocal: 1.38,
        fxRate: 1.089,
        proceedsUsdc: 1.5,
      },
      {
        country: "Japan",
        countryCode: "JP",
        units: 1,
        localCurrency: "JPY",
        earnedLocal: 156,
        fxRate: 0.0064,
        proceedsUsdc: 1.0,
      },
      {
        country: "Canada",
        countryCode: "CA",
        units: 1,
        localCurrency: "CAD",
        earnedLocal: 1.09,
        fxRate: 0.732,
        proceedsUsdc: 0.8,
      },
    ],
  },
  {
    month: "March 2026",
    monthKey: "2026-03",
    status: "paid",
    totalUsdc: 482.6,
    issuedDate: "Apr 3, 2026",
    settlementHash: "mock-order-2026-03-fireblocks-demo",
    destination: "Stablecoin Wallet · 0x6602…0469",
    breakdown: [
      {
        country: "United States",
        countryCode: "US",
        units: 128,
        localCurrency: "USD",
        earnedLocal: 222.6,
        fxRate: 1.0,
        proceedsUsdc: 222.6,
      },
      {
        country: "United Kingdom",
        countryCode: "GB",
        units: 32,
        localCurrency: "GBP",
        earnedLocal: 50.0,
        fxRate: 1.268,
        proceedsUsdc: 63.4,
      },
      {
        country: "Germany",
        countryCode: "DE",
        units: 36,
        localCurrency: "EUR",
        earnedLocal: 64.0,
        fxRate: 1.088,
        proceedsUsdc: 69.63,
      },
      {
        country: "Japan",
        countryCode: "JP",
        units: 41,
        localCurrency: "JPY",
        earnedLocal: 11_600,
        fxRate: 0.0064,
        proceedsUsdc: 74.24,
      },
      {
        country: "Canada",
        countryCode: "CA",
        units: 21,
        localCurrency: "CAD",
        earnedLocal: 72.0,
        fxRate: 0.734,
        proceedsUsdc: 52.85,
      },
    ],
  },
  {
    month: "February 2026",
    monthKey: "2026-02",
    status: "paid",
    totalUsdc: 396.78,
    issuedDate: "Mar 4, 2026",
    settlementHash: "mock-order-2026-02-fireblocks-demo",
    destination: "Stablecoin Wallet · 0x6602…0469",
    breakdown: [
      {
        country: "United States",
        countryCode: "US",
        units: 104,
        localCurrency: "USD",
        earnedLocal: 182.2,
        fxRate: 1.0,
        proceedsUsdc: 182.2,
      },
      {
        country: "United Kingdom",
        countryCode: "GB",
        units: 26,
        localCurrency: "GBP",
        earnedLocal: 41.0,
        fxRate: 1.27,
        proceedsUsdc: 52.07,
      },
      {
        country: "Germany",
        countryCode: "DE",
        units: 29,
        localCurrency: "EUR",
        earnedLocal: 52.0,
        fxRate: 1.086,
        proceedsUsdc: 56.47,
      },
      {
        country: "Japan",
        countryCode: "JP",
        units: 34,
        localCurrency: "JPY",
        earnedLocal: 9_400,
        fxRate: 0.0065,
        proceedsUsdc: 61.1,
      },
      {
        country: "Canada",
        countryCode: "CA",
        units: 17,
        localCurrency: "CAD",
        earnedLocal: 61.0,
        fxRate: 0.735,
        proceedsUsdc: 44.94,
      },
    ],
  },
];

export type AgreementStatus = "Active" | "Expired" | "New";

export interface Agreement {
  id: string;
  name: string;
  type: string;
  signedDate: string | null;
  expiresDate: string | null;
  status: AgreementStatus;
}

export const agreements: Agreement[] = [
  {
    id: "agr-001",
    name: "Paid applications schedule",
    type: "Developer program license agreement",
    signedDate: "Jan 12, 2024",
    expiresDate: null,
    status: "Active",
  },
  {
    id: "agr-002",
    name: "Free applications schedule",
    type: "Developer program license agreement",
    signedDate: "Jan 12, 2024",
    expiresDate: null,
    status: "Active",
  },
  {
    id: "agr-003",
    name: "Stablecoin payout addendum",
    type: "Proceeds payout agreement",
    signedDate: "Mar 1, 2025",
    expiresDate: "Mar 1, 2026",
    status: "Active",
  },
];

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: "Checking" | "Savings";
  lastFour: string;
  currency: string;
  country: string;
  addedDate: string;
  status: "Active" | "Pending";
  isPrimary: boolean;
}

export const bankAccounts: BankAccount[] = [
  {
    id: "bank-001",
    bankName: "Chase Bank",
    accountType: "Checking",
    lastFour: "4821",
    currency: "USD",
    country: "United States",
    addedDate: "Nov 3, 2023",
    status: "Active",
    isPrimary: true,
  },
  {
    id: "bank-002",
    bankName: "Silicon Valley Bank",
    accountType: "Checking",
    lastFour: "7734",
    currency: "USD",
    country: "United States",
    addedDate: "Feb 18, 2024",
    status: "Active",
    isPrimary: false,
  },
  {
    id: "bank-003",
    bankName: "Mercury",
    accountType: "Checking",
    lastFour: "9902",
    currency: "USD",
    country: "United States",
    addedDate: "Mar 5, 2025",
    status: "Pending",
    isPrimary: false,
  },
];

export interface StablecoinTransaction {
  id: string;
  label: string;
  description: string;
  amount: string;
  amountValue: number;
  date: string;
  isoDate: string;
  type: "credit" | "debit";
}

/**
 * Monthly-push model (Option C): Apple still batches proceeds on its fiscal
 * schedule, but delivers them as a single on-chain push per month. The ledger
 * below shows the two completed monthly pushes plus the developer's own
 * outbound spend.
 */
export const stablecoinTransactions: StablecoinTransaction[] = [
  {
    id: "tx-008",
    label: "Figma",
    description: "Design tool",
    amount: "-$15.00",
    amountValue: -15,
    date: "Apr 10, 2026",
    isoDate: "2026-04-10",
    type: "debit",
  },
  {
    id: "tx-007",
    label: "App Store",
    description: "March 2026 proceeds · monthly payout",
    amount: "+$482.60",
    amountValue: 482.6,
    date: "Apr 3, 2026",
    isoDate: "2026-04-03",
    type: "credit",
  },
  {
    id: "tx-006",
    label: "RevenueCat",
    description: "Subscription analytics",
    amount: "-$29.00",
    amountValue: -29,
    date: "Mar 18, 2026",
    isoDate: "2026-03-18",
    type: "debit",
  },
  {
    id: "tx-005",
    label: "Supabase",
    description: "Hosting · monthly",
    amount: "-$25.00",
    amountValue: -25,
    date: "Mar 10, 2026",
    isoDate: "2026-03-10",
    type: "debit",
  },
  {
    id: "tx-004",
    label: "App Store",
    description: "February 2026 proceeds · monthly payout",
    amount: "+$396.78",
    amountValue: 396.78,
    date: "Mar 4, 2026",
    isoDate: "2026-03-04",
    type: "credit",
  },
  {
    id: "tx-003",
    label: "Figma",
    description: "Design tool",
    amount: "-$15.00",
    amountValue: -15,
    date: "Feb 22, 2026",
    isoDate: "2026-02-22",
    type: "debit",
  },
  {
    id: "tx-002",
    label: "Supabase",
    description: "Hosting · monthly",
    amount: "-$25.00",
    amountValue: -25,
    date: "Feb 10, 2026",
    isoDate: "2026-02-10",
    type: "debit",
  },
  {
    id: "tx-001",
    label: "App Store",
    description: "January 2026 proceeds · monthly payout",
    amount: "+$342.15",
    amountValue: 342.15,
    date: "Feb 4, 2026",
    isoDate: "2026-02-04",
    type: "credit",
  },
];
