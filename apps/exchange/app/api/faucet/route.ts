import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, erc20Abi, formatUnits, http, isAddress, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { env } from "@/lib/env";
import { SEPOLIA_USDC } from "@/lib/backend/types";
import {
  checkFaucetRequest,
  DEFAULT_FAUCET_AMOUNTS,
  DEFAULT_FAUCET_DAILY_PER_ADDRESS,
  DEFAULT_FAUCET_MAX_USDC,
  grantedToday,
} from "@/lib/faucet/policy";

/**
 * Live-mode testnet faucet. Pays Sepolia USDC from a treasury wallet whose
 * private key lives only in the server env (`FAUCET_PRIVATE_KEY`). The key
 * never reaches the client; the client only ever sees `enabled`, the amount
 * list, and a transaction hash.
 *
 * Disabled (GET → enabled: false) when the key is not configured, so the
 * "Add funds" sheet falls back to showing the deposit address.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limits = {
  amounts: DEFAULT_FAUCET_AMOUNTS,
  maxPerRequest: env.FAUCET_MAX_USDC ?? DEFAULT_FAUCET_MAX_USDC,
  dailyPerAddress: env.FAUCET_DAILY_PER_ADDRESS ?? DEFAULT_FAUCET_DAILY_PER_ADDRESS,
};

// Per-process memory is enough for a stage laptop; a deployed instance
// restarts often enough that this is a soft cap, and the treasury balance
// is the hard one.
const grants = new Map<string, { at: number; amount: number }[]>();

// Bounded so an unreachable RPC turns into an error the sheet can show, not a hang.
const transport = http(env.SEPOLIA_RPC_URL ?? env.NEXT_PUBLIC_SEPOLIA_RPC_URL, { timeout: 15_000, retryCount: 1 });
const publicClient = createPublicClient({ chain: sepolia, transport });

function treasury() {
  const key = env.FAUCET_PRIVATE_KEY;
  if (!key) return null;
  const account = privateKeyToAccount(key as `0x${string}`);
  return { account, wallet: createWalletClient({ account, chain: sepolia, transport }) };
}

async function treasuryBalances(address: `0x${string}`) {
  const [eth, usdc] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({ address: SEPOLIA_USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
  ]);
  return { eth: Number(formatUnits(eth, 18)), usdc: Number(formatUnits(usdc, 6)) };
}

/**
 * Also the deploy health check, so it must answer fast: the balance read is
 * best-effort with a short deadline, and a slow RPC just omits the numbers.
 */
export async function GET() {
  const t = treasury();
  if (!t) return NextResponse.json({ enabled: false, amounts: [] });
  const balances = await Promise.race([
    treasuryBalances(t.account.address).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4_000)),
  ]);
  return NextResponse.json({ enabled: true, amounts: limits.amounts, treasury: { address: t.account.address, ...(balances ?? {}) } });
}

export async function POST(req: Request) {
  const t = treasury();
  if (!t) return NextResponse.json({ error: "The faucet is not configured on this server." }, { status: 503 });
  let body: { address?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const address = typeof body.address === "string" && isAddress(body.address) ? (body.address as `0x${string}`) : null;
  const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
  if (!address) return NextResponse.json({ error: "A valid EVM address is required." }, { status: 400 });

  const key = address.toLowerCase();
  const history = grants.get(key) ?? [];
  const now = Date.now();
  let balances: { eth: number; usdc: number };
  try {
    balances = await treasuryBalances(t.account.address);
  } catch {
    return NextResponse.json({ error: "Could not reach the Sepolia RPC to check the faucet treasury. Set SEPOLIA_RPC_URL to a reachable endpoint." }, { status: 502 });
  }
  const verdict = checkFaucetRequest({ amount, history, now, treasuryUsdc: balances.usdc }, limits);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 429 });
  if (balances.eth < 0.0005) return NextResponse.json({ error: "The faucet treasury is out of Sepolia ETH for gas. Top it up from a Sepolia ETH faucet." }, { status: 503 });

  try {
    const txHash = await t.wallet.writeContract({
      address: SEPOLIA_USDC,
      abi: erc20Abi,
      functionName: "transfer",
      args: [address, parseUnits(String(amount), 6)],
    });
    grants.set(key, [...history.filter((g) => now - g.at < 24 * 60 * 60 * 1000), { at: now, amount }]);
    return NextResponse.json({ txHash, amount, granted: grantedToday(grants.get(key) ?? [], now) });
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0] : "Transfer failed.";
    return NextResponse.json({ error: `Faucet transfer failed: ${message}` }, { status: 502 });
  }
}
