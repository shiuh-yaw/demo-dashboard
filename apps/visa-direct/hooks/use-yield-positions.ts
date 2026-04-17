"use client";

/**
 * Demo-only yield positions.
 *
 * Tracks "idle USDC parked in a yield strategy" for the sales demo.
 * Nothing on-chain happens — we just persist the deposit intent in
 * localStorage so the host can see how an integrated yield story
 * would look in the wallet view (balance split, APY, withdraw).
 *
 * Safe to rip out once a real yield integration (Aave, Morpho, etc.)
 * is wired in: the screen reads from this hook, so swapping the
 * underlying store doesn't touch the UI.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

export interface YieldStrategy {
  id: string;
  protocol: string;
  asset: "USDC";
  /** Network label, e.g. "Base". Cosmetic for the demo. */
  network: string;
  apy: number;
  /** One-line marketing copy shown under the protocol name. */
  tagline: string;
}

export interface YieldPosition {
  strategyId: string;
  /** Principal in USDC, stored as a plain number for demo simplicity. */
  amount: number;
  /** Epoch ms at deposit time — used to render elapsed earnings. */
  depositedAt: number;
}

export const YIELD_STRATEGIES: YieldStrategy[] = [
  {
    id: "aave-v3",
    protocol: "Aave v3",
    asset: "USDC",
    network: "Base",
    apy: 4.82,
    tagline: "Blue-chip money market — battle-tested since 2020",
  },
  {
    id: "morpho-prime",
    protocol: "Morpho",
    asset: "USDC",
    network: "Base",
    apy: 5.46,
    tagline: "Peer-matched lending on top of Aave liquidity",
  },
  {
    id: "compound-v3",
    protocol: "Compound v3",
    asset: "USDC",
    network: "Ethereum",
    apy: 3.91,
    tagline: "Single-asset lending pool with isolated risk",
  },
];

const STORAGE_KEY = "vd_yield_positions";
const EMPTY_POSITIONS: YieldPosition[] = [];

// ---------------------------------------------------------------------------
// Module-level store
// ---------------------------------------------------------------------------
//
// Several components need to see the same positions list and react to
// changes (WalletScreen reads, YieldModal writes). A per-call `useState`
// gives each caller its own copy, which is why the deposit modal's
// write never shows up in the hero until a refresh. A shared store
// with a pub/sub interface wired through React's `useSyncExternalStore`
// fixes that without pulling in a full state library.

function readPositionsFromStorage(): YieldPosition[] {
  if (typeof window === "undefined") return EMPTY_POSITIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_POSITIONS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_POSITIONS;
    return parsed.filter(
      (p): p is YieldPosition =>
        !!p &&
        typeof p === "object" &&
        typeof (p as YieldPosition).strategyId === "string" &&
        typeof (p as YieldPosition).amount === "number" &&
        typeof (p as YieldPosition).depositedAt === "number",
    );
  } catch {
    return EMPTY_POSITIONS;
  }
}

function writePositionsToStorage(positions: YieldPosition[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// Server render returns the empty-positions constant so
// `useSyncExternalStore` gets a stable identity across SSR → CSR.
let clientPositions: YieldPosition[] = EMPTY_POSITIONS;
const listeners = new Set<() => void>();
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (hydrated) return;
  clientPositions = readPositionsFromStorage();
  hydrated = true;
  // Listen for storage events from other tabs so positions stay in
  // sync if a user fiddles with the demo across windows.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      clientPositions = readPositionsFromStorage();
      emit();
    });
  }
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): YieldPosition[] {
  hydrate();
  return clientPositions;
}

function getServerSnapshot(): YieldPosition[] {
  return EMPTY_POSITIONS;
}

function setPositions(next: YieldPosition[]): void {
  clientPositions = next;
  writePositionsToStorage(next);
  emit();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYieldPositions() {
  const positions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Nudge subscribers on mount in case the store hadn't hydrated yet
  // (first `getSnapshot` after SSR returns the empty constant, but the
  // store populates itself inside `hydrate()` on the same call, so a
  // bump here guarantees the first render sees the real data).
  useEffect(() => {
    emit();
  }, []);

  const deposit = useCallback((strategyId: string, amount: number) => {
    const existing = clientPositions.find((p) => p.strategyId === strategyId);
    const next: YieldPosition[] = existing
      ? clientPositions.map((p) =>
          p.strategyId === strategyId
            ? { ...p, amount: p.amount + amount, depositedAt: Date.now() }
            : p,
        )
      : [
          ...clientPositions,
          { strategyId, amount, depositedAt: Date.now() },
        ];
    setPositions(next);
  }, []);

  const withdraw = useCallback((strategyId: string) => {
    setPositions(clientPositions.filter((p) => p.strategyId !== strategyId));
  }, []);

  const totalDeposited = positions.reduce((sum, p) => sum + p.amount, 0);

  return {
    strategies: YIELD_STRATEGIES,
    positions,
    totalDeposited,
    deposit,
    withdraw,
  };
}
