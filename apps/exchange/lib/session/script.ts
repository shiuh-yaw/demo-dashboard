import type { Beat } from "./types";

/**
 * The demo script, as presenter cues. Condensed from Brief 04 (Exchange)
 * so the person on stage never has to look at a slide. Boundaries are the
 * do-not-oversell lines: say each before the room asks.
 */
export interface BeatCue {
  beat: Beat;
  title: string;
  show: string;
  say: string;
  watch: string;
  /** What in the app marks this beat as done. */
  doneWhen: string;
}

export const BEATS: BeatCue[] = [
  {
    beat: 1,
    title: "Social login, silent wallet creation",
    show: "Google or Apple login, straight into the balance view. No address. No seed phrase. No “creating your wallet” interstitial.",
    say: "Nothing in that flow said the word wallet. There is now a non-custodial 2-of-2 wallet on this device, and Exchange cannot move the funds in it.",
    watch: "Do not show the address. The moment an 0x string appears, half the room files this as a crypto product. Reveal it in beat 5.",
    doneWhen: "Signed in and the wallet is ready.",
  },
  {
    beat: 2,
    title: "Fund, then a DeFi position from inside the app",
    show: "Testnet funds land in the balance. Open a yield position from the Earn tab. It appears next to the exchange balance, not in a separate crypto tab.",
    say: "This is the retention answer made concrete. The activity that was walking out the door to MetaMask happens here, on Exchange's screen, in Exchange's session.",
    watch: "The curveball lands here. One sentence, ready now: the wallet connector is one integration for both the embedded wallet and a connected external one. Same session, same policy surface. Then link MetaMask to prove it.",
    doneWhen: "A position is open.",
  },
  {
    beat: 3,
    title: "Gasless transfer, no native token",
    show: "ETH balance is zero, visibly. Send USDC anyway. It succeeds.",
    say: "New users do not have gas and will not buy gas to make their first transaction.",
    watch: "Say the provisioning model in the same breath: gas sponsorship is Enterprise tier and provisioned manually, on Dynamic's native 7702 relayer. It is not a self-serve toggle.",
    doneWhen: "A sponsored transfer has confirmed.",
  },
  {
    beat: 4,
    title: "Device loss and recovery",
    show: "Lose the device (presenter rail). Sign in on the second device. The wallet restores from the encrypted share backup. Balance and position intact.",
    say: "This is the beat that answers “what happens when a user calls support”. Recovery without custody is the thing weak non-custodial setups quietly fail: they fall back to someone holding the key.",
    watch: "Nobody types twelve words. Exchange never held a key. Point at the identical address only after the restore completes.",
    doneWhen: "Recovered on device B.",
  },
  {
    beat: 5,
    title: "The 2-of-2 split, and what a breach reaches",
    show: "Architecture view, live, with this session's wallet on it. Then colour in the blast radius: Exchange's database, Dynamic's infrastructure, an insider.",
    say: "Close on the risk team's language. The concentration they wrote up does not get mitigated. It stops existing.",
    watch: "This is where the address can finally appear, because now it means something.",
    doneWhen: "Architecture view opened.",
  },
];

export interface Boundary {
  feature: string;
  claim: string;
  boundary: string;
}

export const BOUNDARIES: Boundary[] = [
  {
    feature: "TSS-MPC 2-of-2",
    claim: "User share on device, server share in an enclave, full key never assembled.",
    boundary: "ECDSA (DKLs23) for EVM, EdDSA (FROST) for Solana.",
  },
  {
    feature: "Passkey",
    claim: "WebAuthn sign-in, passkey usable as MFA.",
    boundary: "Sign-in only in current docs. Not registration.",
  },
  {
    feature: "Device recovery",
    claim: "Encrypted share backup via the Encryption Proxy; optional cloud backup for 2-of-3.",
    boundary: "No seed phrase at any point. Exchange never holds a key.",
  },
  {
    feature: "Wallet connector",
    claim: "One integration: embedded and external wallets.",
    boundary: "This is the retention answer. Deploy it early, at beat 2.",
  },
  {
    feature: "Gas sponsorship",
    claim: "Native 7702 relayer.",
    boundary: "Enterprise tier, provisioned manually. Not self-serve.",
  },
  {
    feature: "Earn",
    claim: "Aave, Morpho, Sentora.",
    boundary: "Stablecoin and EVM only. Solana and Tron are H2 2026 roadmap.",
  },
  {
    feature: "Server wallets",
    claim: "Node, Python, Rust, Java SDKs.",
    boundary: "EVM only. Tron is not supported; route Tron to Fireblocks Flow.",
  },
  {
    feature: "Local / private chains",
    claim: "—",
    boundary: "A live gap. If they name a domestic EVM chain, check before committing.",
  },
];

export const TRAP_QUESTIONS = [
  "Who does the on and off ramp in my country: know the partner network and corridor gaps. Never improvise a partner name live.",
  "Where does Fireblocks end and Dynamic begin: Fireblocks vault for Exchange's treasury, Dynamic for the three million end-user wallets.",
  "How does pricing work: MAU-based. Do not negotiate it, do not contradict it. Park it and hand it to the AE.",
];
