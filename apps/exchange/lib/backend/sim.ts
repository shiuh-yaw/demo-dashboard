import { getAddress, keccak256, toBytes, toHex } from "viem";
import type { Position, SessionWallet, ShareInfo } from "@/lib/session/types";
import { SEPOLIA_CHAIN_ID, SEPOLIA_NAME } from "./types";

/** Deterministic, checksummed address from any seed - same email, same wallet, every run. */
export const addressFor = (seed: string): `0x${string}` => {
  const h = keccak256(toBytes(`exchange-demo:${seed}`));
  return getAddress(`0x${h.slice(-40)}`);
};

export const shareId = (address: string, location: string, salt = "") =>
  `sh_${keccak256(toBytes(`${address}:${location}:${salt}`)).slice(2, 18)}`;

export const fakeTxHash = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return keccak256(toHex(bytes));
};

export const makeShares = (address: string, deviceId: "A" | "B", now: number, createdAt = now): ShareInfo[] => [
  { id: shareId(address, "device", deviceId), location: "device", label: `Client share · device ${deviceId}`, encrypted: true, createdAt: now },
  { id: shareId(address, "enclave"), location: "enclave", label: "Server share · hardware enclave (TEE)", encrypted: true, createdAt },
  { id: shareId(address, "backup"), location: "backup", label: "Encrypted client-share backup", backupLocation: "dynamic", encrypted: true, createdAt },
];

export const makeWallet = (email: string, now: number): SessionWallet => {
  const address = addressFor(email);
  return {
    address,
    chainId: SEPOLIA_CHAIN_ID,
    chainName: SEPOLIA_NAME,
    scheme: "TWO_OF_TWO",
    curve: "ECDSA · DKLs23",
    shares: makeShares(address, "A", now),
    backup: { location: "dynamic", status: "backed-up" },
    createdAt: now,
    deviceId: "A",
    walletId: `wal_${keccak256(toBytes(address)).slice(2, 14)}`,
    version: "V3",
  };
};

export const APY: Record<Position["protocol"], number> = { Aave: 4.12, Morpho: 5.36, Sentora: 4.78 };

export const uid = () => Math.random().toString(36).slice(2, 10);
