/** Base Sepolia + Rain test-token (RUSDC) constants. Sandbox only (Phase 1). */
export const BASE_SEPOLIA_ID = 84532;
/** Block explorer for Base Sepolia - address/tx deep links. */
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";
export const RUSDC_ADDRESS =
  "0x10b5Be494C2962A7B318aFB63f0Ee30b959D000b" as const;
export const RUSDC_DECIMALS = 6;
export const FAUCET_DOLLARS = 100;

/** RUSDC mint fragment (test faucet) - erc20 transfer/balanceOf come from viem's erc20Abi. */
export const RUSDC_MINT_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

/** Occupation options for the apply form (ported from the OSS reference). */
export const OCCUPATION_OPTIONS = [
  { id: "11-1011", name: "Chief Executives" },
  { id: "11-1031", name: "Legislators" },
  { id: "11-2011", name: "Advertising and Promotions Managers" },
  { id: "11-2031", name: "Public Relations and Fundraising Managers" },
  { id: "11-3031", name: "Financial Managers" },
  { id: "11-3051", name: "Industrial Production Managers" },
  { id: "11-3071", name: "Transportation, Storage, and Distribution Managers" },
  { id: "11-9021", name: "Construction Managers" },
] as const;

/** US state/region codes for the apply form's address step. */
export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

/** Account-purpose options for the apply form's financial step. */
export const ACCOUNT_PURPOSE_OPTIONS = [
  { value: "spending", label: "Spending" },
  { value: "savings", label: "Savings" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
] as const;
