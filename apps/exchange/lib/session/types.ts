export type Beat = 1 | 2 | 3 | 4 | 5;
export type Provider = "google" | "apple" | "email";
export type View = "portfolio" | "markets" | "earn" | "activity" | "architecture";
export type Mode = "staged" | "live";

export interface Person {
  /** Stable id for analytics identity - the Dynamic user id in live mode. */
  userId: string;
  name: string;
  email: string;
  provider: Provider;
  initials: string;
}

export type ShareLocation = "device" | "enclave" | "backup";

export interface ShareInfo {
  id: string;
  location: ShareLocation;
  label: string;
  /** Where the SDK reports the share is backed up (e.g. "dynamic", "googleDrive"). */
  backupLocation?: string;
  encrypted: boolean;
  createdAt: number;
}

export interface SessionWallet {
  address: `0x${string}`;
  chainId: number;
  chainName: string;
  scheme: "TWO_OF_TWO" | "TWO_OF_THREE" | "THREE_OF_FIVE";
  curve: string;
  shares: ShareInfo[];
  backup: { location: string; status: "backed-up" | "pending" };
  createdAt: number;
  /** Set when the wallet was restored onto a new device (beat 4). */
  recoveredAt?: number;
  /** Which device currently holds the client share. */
  deviceId: "A" | "B";
  walletId?: string;
  version?: string;
}

export interface ExternalWallet {
  address: `0x${string}`;
  label: string;
  linkedAt: number;
}

export interface Position {
  id: string;
  protocol: "Aave" | "Morpho" | "Sentora";
  asset: "USDC";
  principal: number;
  apy: number;
  openedAt: number;
  txHash: string;
}

export type ActivityKind =
  | "signin"
  | "wallet-created"
  | "fund"
  | "earn-open"
  | "transfer"
  | "device-lost"
  | "recovered"
  | "external-linked";

export interface Activity {
  id: string;
  at: number;
  kind: ActivityKind;
  title: string;
  detail?: string;
  amount?: number;
  txHash?: string;
  sponsored?: boolean;
}

export interface Balances {
  usdc: number;
  eth: number;
  updatedAt: number;
}

export interface SessionState {
  mode: Mode;
  person: Person | null;
  /** Remembered on the sign-in screen after a device loss, so the returning user is recognised. */
  knownPerson: Person | null;
  wallet: SessionWallet | null;
  external: ExternalWallet | null;
  balances: Balances;
  positions: Position[];
  activity: Activity[];
  device: "A" | "B";
  /** True between "device lost" and a successful recovery. */
  deviceLost: boolean;
  recovering: boolean;
  beatsDone: Record<Beat, boolean>;
  revealAddress: boolean;
  presenter: boolean;
  /** Hide the Dynamic site chrome on the exchange screens (presenter toggle). */
  immersive: boolean;
  startedAt: number;
}

export type Action =
  | { type: "reset"; mode: Mode }
  | { type: "signed-in"; person: Person }
  | { type: "wallet-ready"; wallet: SessionWallet }
  | { type: "signed-out" }
  | { type: "balances"; balances: Partial<Balances> }
  | { type: "position-opened"; position: Position; debit: number }
  | { type: "activity"; item: Activity }
  | { type: "external-linked"; external: ExternalWallet }
  | { type: "device-lost" }
  | { type: "recovering"; on: boolean }
  | { type: "recovered"; wallet: SessionWallet }
  | { type: "beat-done"; beat: Beat }
  | { type: "reveal"; on: boolean }
  | { type: "presenter"; on: boolean }
  | { type: "immersive"; on: boolean };
