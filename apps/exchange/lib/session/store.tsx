"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Action, Beat, Mode, SessionState } from "./types";

const KEY = "exchange.session.v1";

export const initialState = (mode: Mode): SessionState => ({
  mode,
  person: null,
  knownPerson: null,
  wallet: null,
  external: null,
  balances: { usdc: 0, eth: 0, updatedAt: 0 },
  positions: [],
  activity: [],
  device: "A",
  deviceLost: false,
  recovering: false,
  beatsDone: { 1: false, 2: false, 3: false, 4: false, 5: false },
  revealAddress: false,
  presenter: false,
  immersive: false,
  startedAt: Date.now(),
});

type StoreAction = Action | { type: "hydrate"; state: SessionState };

const prepend = <T,>(item: T, list: T[], cap = 50) => [item, ...list].slice(0, cap);

/**
 * Pure reducer for the five-beat journey. Exported so the beat transitions
 * (device loss drops the client share but never a balance or a position) are
 * unit-tested without a DOM.
 */
export function reducer(s: SessionState, a: StoreAction): SessionState {
  switch (a.type) {
    case "hydrate":
      return a.state;
    case "reset":
      return initialState(a.mode);
    case "signed-in":
      return { ...s, person: a.person, knownPerson: a.person };
    case "wallet-ready":
      return { ...s, wallet: a.wallet, deviceLost: false, recovering: false };
    case "signed-out":
      return { ...s, person: null };
    case "balances":
      return { ...s, balances: { ...s.balances, ...a.balances, updatedAt: Date.now() } };
    case "position-opened":
      return {
        ...s,
        positions: [a.position, ...s.positions],
        balances: { ...s.balances, usdc: Math.max(0, s.balances.usdc - a.debit), updatedAt: Date.now() },
      };
    case "activity":
      return { ...s, activity: prepend(a.item, s.activity) };
    case "external-linked":
      return { ...s, external: a.external };
    case "device-lost":
      // The device is gone: so is the client share and the session on it.
      // Balances and positions live on chain and are untouched.
      return {
        ...s,
        device: "B",
        deviceLost: true,
        person: null,
        wallet: s.wallet ? { ...s.wallet, shares: s.wallet.shares.filter((sh) => sh.location !== "device") } : null,
        revealAddress: false,
      };
    case "recovering":
      return { ...s, recovering: a.on };
    case "recovered":
      return { ...s, wallet: a.wallet, deviceLost: false, recovering: false };
    case "beat-done":
      return { ...s, beatsDone: { ...s.beatsDone, [a.beat]: true } };
    case "reveal":
      return { ...s, revealAddress: a.on };
    case "presenter":
      return { ...s, presenter: a.on };
    case "immersive":
      return { ...s, immersive: a.on };
    default:
      return s;
  }
}

/** Read the persisted session; the presenter rail never survives a refresh. */
export const loadPersisted = (mode: Mode): SessionState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState(mode);
    const parsed = JSON.parse(raw) as SessionState;
    // A mode change (env id added or removed) invalidates a persisted session.
    if (parsed.mode !== mode) return initialState(mode);
    return { ...initialState(mode), ...parsed, recovering: false, presenter: false };
  } catch {
    return initialState(mode);
  }
};

export const wipePersistedSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
};

export const beatOf = (state: SessionState): Beat => {
  const b = state.beatsDone;
  if (!b[1]) return 1;
  if (!b[2]) return 2;
  if (!b[3]) return 3;
  if (!b[4]) return 4;
  return 5;
};

interface Ctx {
  state: SessionState;
  dispatch: React.Dispatch<Action>;
  currentBeat: Beat;
  /** False until the persisted session has been read on the client. */
  hydrated: boolean;
}

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  // localStorage is unreadable on the server, so both sides render the initial
  // state first; the stored session replaces it after mount. Persisting waits
  // for that hydrate so an initial state never overwrites a real one.
  const [state, dispatch] = useReducer(reducer, mode, initialState);
  const hydratedRef = useRef(false);
  const [hydrated, markHydrated] = useReducer(() => true, false);

  useEffect(() => {
    dispatch({ type: "hydrate", state: loadPersisted(mode) });
    hydratedRef.current = true;
    markHydrated();
  }, [mode]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo(
    () => ({ state, dispatch: dispatch as React.Dispatch<Action>, currentBeat: beatOf(state), hydrated }),
    [state, hydrated],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
};
