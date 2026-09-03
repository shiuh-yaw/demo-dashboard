import type { Mode, Position, Provider } from "@/lib/session/types";

export interface Progress {
  label: string;
  index: number;
  total: number;
}

export interface SignInHint {
  name?: string;
  email?: string;
}

/** What the sign-in card needs from a backend to render itself. */
export interface AuthSurface {
  emailEnabled: boolean;
  socialProviders: string[];
}

/**
 * Everything the exchange UI needs from the wallet layer, in one interface.
 * Two implementations: `staged` (offline simulation, safe on stage wifi) and
 * `live` (Dynamic JS SDK on Sepolia). The UI never knows which.
 */
export interface Backend {
  mode: Mode;
  /** SDK initialised (live) - always true in staged mode. */
  ready: boolean;
  /** Human-readable label of the operation in flight, or null. */
  busy: string | null;
  /** Multi-step progress (recovery), or null. */
  progress: Progress | null;
  error: string | null;
  clearError(): void;
  auth: AuthSurface;
  /** Whether beat 3 will be sponsored, and why not when it will not. */
  sponsorship: { nativeSponsorship: boolean; zerodevAccount: boolean; sepoliaSponsored: boolean; networkId?: string };

  /** Social sign-in. Live mode redirects to the provider and returns after the round trip. */
  signInWithSocial(provider: Provider, hint?: SignInHint): Promise<void>;
  /** Email OTP, step 1. Returns an opaque verification handle for `verifyEmailCode`. */
  sendEmailCode(email: string, hint?: SignInHint): Promise<unknown>;
  /** Email OTP, step 2. */
  verifyEmailCode(verification: unknown, code: string): Promise<void>;
  /** Detect and complete an OAuth redirect on mount; true when one was handled. */
  completeOAuthRedirect(): Promise<boolean>;
  signOut(): Promise<void>;

  /** Staged mode credits a testnet faucet. Live mode: false - use depositAddress(). */
  canFaucet: boolean;
  fund(amountUsdc: number): Promise<void>;
  depositAddress(): `0x${string}` | null;

  openPosition(protocol: Position["protocol"], amountUsdc: number): Promise<void>;
  transfer(to: `0x${string}`, amountUsdc: number): Promise<void>;
  /** Wallets the user could link right now (live: discovered by the SDK; staged: MetaMask). */
  externalWalletOptions: { key: string; name: string; icon?: string }[];
  /** Link an external wallet by provider key. Staged mode ignores the key and simulates MetaMask. */
  connectExternal(walletProviderKey?: string): Promise<void>;

  /** Beat 4: discard the client share and the session on this device. */
  loseDevice(): Promise<void>;
  /** Beat 4: sign in on the "new" device and restore from the encrypted backup. Social only. */
  recover(provider: Provider): Promise<void>;

  refreshBalances(): Promise<void>;
  /** Wipe everything, including SDK storage, for the next run. */
  hardReset(): Promise<void>;
}

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_NAME = "Ethereum Sepolia";
/** Circle's USDC on Sepolia. Six decimals. */
export const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;
export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
