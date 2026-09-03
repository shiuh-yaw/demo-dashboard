"use client";

/** Browser side of the live-mode faucet: two fetches, no secrets. */

export interface FaucetStatus {
  enabled: boolean;
  amounts: number[];
  treasury?: { address: string; usdc?: number; eth?: number };
}

export async function getFaucetStatus(): Promise<FaucetStatus> {
  try {
    const res = await fetch("/api/faucet", { cache: "no-store" });
    if (!res.ok) return { enabled: false, amounts: [] };
    return (await res.json()) as FaucetStatus;
  } catch {
    return { enabled: false, amounts: [] };
  }
}

export async function requestFaucet(address: string, amount: number): Promise<{ txHash: `0x${string}` }> {
  const res = await fetch("/api/faucet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, amount }),
  });
  const data = (await res.json().catch(() => ({}))) as { txHash?: `0x${string}`; error?: string };
  if (!res.ok || !data.txHash) throw new Error(data.error ?? "The faucet did not respond.");
  return { txHash: data.txHash };
}
